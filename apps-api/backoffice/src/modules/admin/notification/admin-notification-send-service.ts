import { InternalErrorCode } from '@pple-today/api-common/dtos'
import {
  isThaiMobileE164,
  mapRepositoryError,
  normalizeThaiPhoneNumber,
} from '@pple-today/api-common/utils'
import { NotificationInAppType, NotificationLinkType } from '@pple-today/database/prisma'
import { err, ok } from 'neverthrow'

import type {
  AdminCountNotificationAudienceResponse,
  AdminListNotificationResponsesResponse,
  AdminListSentNotificationsResponse,
  AdminNotificationAudience,
  AdminNotificationLink,
  AdminSendNotificationBody,
  AdminSentNotificationAudience,
  AdminSentNotificationDetail,
  AdminSentNotificationSummary,
} from './models'
import type { AdminSentNotificationRepository, SentNotificationRow } from './sent-repository'

import { deriveInteractionState } from '../../notification/interaction'
import { isStoredInteraction } from '../../notification/interaction-read'
import { prepareInteractionSend } from '../../notification/interaction-send'
import type { CreateNewExternalNotificationBody } from '../../notification/models'
import type { NotificationRepository } from '../../notification/repository'
import { resolveAppLinkPath } from '../../notification/resolve-app-link-path'

/**
 * In-app destinations that name one entity and so need its id. The rest are
 * screens (a tab or a list) and take none. `MINI_APP_INVITE` is a marker for the
 * Beta invite inbox, not a destination, and is refused.
 */
const IN_APP_TYPES_WITH_ID = new Set<NotificationInAppType>([
  NotificationInAppType.POST,
  NotificationInAppType.POLL,
  NotificationInAppType.TOPIC,
  NotificationInAppType.USER,
  NotificationInAppType.ANNOUNCEMENT,
  NotificationInAppType.ELECTION,
  NotificationInAppType.ELECTION_VOTE,
  NotificationInAppType.HASHTAG,
])

const invalidRecipients = (message: string) =>
  err({ code: InternalErrorCode.NOTIFICATION_INVALID_RECIPIENTS, message })

const invalidInApp = (message: string) =>
  err({ code: InternalErrorCode.NOTIFICATION_INVALID_IN_APP_NAVIGATION, message })

/**
 * Normalise a list of phone numbers to E.164, deduplicated in first-seen order.
 * Every entry that is not a Thai mobile is returned in `invalid` as written.
 */
export const normalizePhoneNumbers = (raw: string[]) => {
  const valid = new Set<string>()
  const invalid: string[] = []
  for (const entry of raw) {
    const trimmed = entry.trim()
    if (trimmed.length === 0) continue
    const phoneNumber = normalizeThaiPhoneNumber(trimmed)
    if (isThaiMobileE164(phoneNumber)) valid.add(phoneNumber)
    else invalid.push(trimmed)
  }
  return { valid: Array.from(valid), invalid }
}

/**
 * The portal audience in the shape the send pipeline takes, or a refusal. An
 * audience that names nobody is refused rather than sent: none of these may
 * fall back to "everyone".
 */
export const toPipelineAudience = (audience: AdminNotificationAudience) => {
  switch (audience.type) {
    case 'BROADCAST':
      return ok({ type: 'BROADCAST' as const })
    case 'ROLE': {
      const roles = Array.from(new Set(audience.roles.map((r) => r.trim()).filter(Boolean)))
      if (roles.length === 0) return invalidRecipients('Choose at least one role.')
      return ok({ type: 'ROLE' as const, details: roles })
    }
    case 'ADDRESS': {
      const provinces = Array.from(new Set(audience.provinces.filter(Boolean)))
      const districts = Array.from(new Set(audience.districts.filter(Boolean)))
      if (provinces.length === 0 && districts.length === 0) {
        return invalidRecipients('Choose at least one province or district.')
      }
      return ok({ type: 'ADDRESS' as const, details: { provinces, districts } })
    }
    case 'PHONE_NUMBER': {
      const { valid, invalid } = normalizePhoneNumbers(audience.phoneNumbers)
      if (invalid.length > 0) {
        return invalidRecipients(`Not a Thai mobile number: ${invalid.slice(0, 20).join(', ')}`)
      }
      if (valid.length === 0) return invalidRecipients('Enter at least one phone number.')
      return ok({ type: 'PHONE_NUMBER' as const, details: valid })
    }
  }
}

/** The audience as stored on a notification row, for display. */
export const toSentAudience = (
  row: Pick<SentNotificationRow, 'isBroadcast' | 'roles' | 'provinces' | 'districts' | '_count'>
): AdminSentNotificationAudience => {
  if (row.isBroadcast) return { type: 'BROADCAST' }
  if (row.roles.length > 0) return { type: 'ROLE', roles: row.roles }
  if (row.provinces.length > 0 || row.districts.length > 0) {
    return { type: 'ADDRESS', provinces: row.provinces, districts: row.districts }
  }
  return { type: 'PHONE_NUMBER', phoneNumberCount: row._count.phoneNumbers }
}

/**
 * The interaction's state as a whole: open, closed or expired. Never
 * RESPONDED, which is one recipient's state, not the notification's.
 */
export const toSentInteractionState = (
  row: Pick<SentNotificationRow, 'interaction' | 'interactionClosedAt' | 'interactionExpiresAt'>,
  now: Date
) => {
  if (!isStoredInteraction(row.interaction)) return null
  const state = deriveInteractionState({
    hasResponse: false,
    closedAt: row.interactionClosedAt,
    expiresAt: row.interactionExpiresAt,
    appGone: false,
    now,
  })
  return state === 'RESPONDED' ? 'OPEN' : state
}

const toSummary = (row: SentNotificationRow, now: Date): AdminSentNotificationSummary => ({
  id: row.id,
  title: row.title,
  message: row.message,
  audience: toSentAudience(row),
  hasInteraction: isStoredInteraction(row.interaction),
  interactionState: toSentInteractionState(row, now),
  recipientCount: row._count.sentNotifications,
  responseCount: row._count.responses,
  sentBy: row.sentByUser ? { id: row.sentByUser.id, name: row.sentByUser.name } : null,
  createdAt: row.createdAt,
})

const toSentLink = (row: SentNotificationRow): AdminSentNotificationDetail['link'] => {
  switch (row.linkType) {
    case NotificationLinkType.IN_APP_NAVIGATION:
      return {
        type: 'IN_APP_NAVIGATION',
        inAppType: row.linkInAppType!,
        inAppId: row.linkInAppId ?? '',
        bypassNotificationCenter: row.linkBypassNotificationCenter === true,
      }
    case NotificationLinkType.MINI_APP:
      return {
        type: 'MINI_APP',
        destination: row.linkDestination ?? '',
        bypassNotificationCenter: row.linkBypassNotificationCenter === true,
      }
    case NotificationLinkType.EXTERNAL_BROWSER:
      return { type: 'EXTERNAL_BROWSER', destination: row.linkDestination ?? '' }
    default:
      return null
  }
}

/**
 * Sending from the admin portal, and reading back what it sent.
 *
 * A portal send is always PPLE Today's own notification: it names no sender app
 * and carries no app key, so there is nothing app-bound about it. It reaches
 * whoever the admin names (broadcast, role, area, or phone numbers), unmetered,
 * through the same pipeline as the raw `/send`. An interaction's answers are kept
 * here and listed in the portal instead of being POSTed to an app.
 *
 * Kept free of Elysia/config imports so it can be unit-tested without booting the
 * app's config graph; the plugin wiring lives in `services.ts`.
 */
export class AdminNotificationSendService {
  constructor(
    private readonly sentRepository: Pick<
      AdminSentNotificationRepository,
      | 'findMiniAppSlug'
      | 'listRoles'
      | 'publishImage'
      | 'countRecipients'
      | 'listSent'
      | 'getSent'
      | 'listResponses'
    >,
    private readonly notificationRepository: Pick<
      NotificationRepository,
      'sendNotificationToUser' | 'countAudience'
    >,
    private readonly options: {
      /** Public origin of the mini-app redirect host (`MINIAPP_REDIRECT_ORIGIN`). */
      miniAppRedirectOrigin: string
      /** `INTERACTIVE_NOTIFICATIONS_ENABLED`. While false a send with `interaction` is refused. */
      interactiveNotificationsEnabled: boolean
      now?: () => Date
    }
  ) {}

  private now() {
    return this.options.now?.() ?? new Date()
  }

  /** Turn the portal's link into the stored link shape, resolving a mini app to its URL. */
  private async resolveLink(link: AdminNotificationLink | undefined) {
    type Link = NonNullable<CreateNewExternalNotificationBody['content']['link']>
    if (!link) return ok<Link | undefined>(undefined)

    switch (link.type) {
      case 'EXTERNAL_BROWSER':
        return ok<Link | undefined>({ type: 'EXTERNAL_BROWSER', destination: link.url })
      case 'IN_APP_NAVIGATION': {
        if (link.inAppType === NotificationInAppType.MINI_APP_INVITE) {
          return invalidInApp('MINI_APP_INVITE is not a destination.')
        }
        const needsId = IN_APP_TYPES_WITH_ID.has(link.inAppType)
        const inAppId = needsId ? (link.inAppId?.trim() ?? '') : ''
        if (needsId && !inAppId) return invalidInApp(`${link.inAppType} needs an id.`)
        return ok<Link | undefined>({
          type: 'IN_APP_NAVIGATION',
          destination: { inAppType: link.inAppType, inAppId },
          bypassNotificationCenter: link.bypassNotificationCenter,
        })
      }
      case 'MINI_APP': {
        const app = await this.sentRepository.findMiniAppSlug(link.miniAppId)
        if (app.isErr()) return mapRepositoryError(app.error)
        if (!app.value) {
          return err({
            code: InternalErrorCode.MINI_APP_NOT_FOUND,
            message: 'The mini app to link to was not found',
          })
        }
        const resolved = resolveAppLinkPath(
          link.path?.trim() || '/',
          app.value,
          this.options.miniAppRedirectOrigin
        )
        if (resolved.isErr()) return err(resolved.error)
        return ok<Link | undefined>({
          type: 'MINI_APP',
          destination: resolved.value.destination,
          bypassNotificationCenter: link.bypassNotificationCenter,
        })
      }
    }
  }

  async send(body: AdminSendNotificationBody, admin: { userId: string }) {
    const audience = toPipelineAudience(body.audience)
    if (audience.isErr()) return err(audience.error)

    if (body.smsFallbackText !== undefined && audience.value.type !== 'PHONE_NUMBER') {
      return err({
        code: InternalErrorCode.BAD_REQUEST,
        message: 'SMS fallback is only available when sending to phone numbers.',
      })
    }

    const link = await this.resolveLink(body.link)
    if (link.isErr()) return err(link.error)

    // No app and no callback: the answers stay here, so the only checks are the
    // flag, bypass, and the shape of the interaction itself.
    const interaction = await prepareInteractionSend({
      input: body.interaction,
      enabled: this.options.interactiveNotificationsEnabled,
      // An external link has no bypass: the schema gives it no such field.
      bypass: link.value?.bypassNotificationCenter === true,
      app: null,
      collectedInPortal: true,
      getCallbackTarget: async () => null,
      now: this.now(),
    })
    if (interaction.isErr()) return err(interaction.error)

    // Last, so a send refused above leaves no orphaned public file.
    let image: string | undefined
    if (body.content.imageFilePath) {
      const published = await this.sentRepository.publishImage(body.content.imageFilePath)
      if (published.isErr()) return err(published.error)
      image = published.value
    }

    const sent = await this.notificationRepository.sendNotificationToUser(
      audience.value,
      {
        header: body.content.header,
        message: body.content.message,
        image,
        actionButtonText: link.value ? body.content.actionButtonText : undefined,
        link: link.value,
      },
      {
        smsFallbackText: body.smsFallbackText,
        interaction: interaction.value,
        sentFromAdminPortal: { userId: admin.userId },
      }
    )
    if (sent.isErr()) return mapRepositoryError(sent.error)

    const recipients = await this.sentRepository.countRecipients(sent.value.notificationId)
    if (recipients.isErr()) return mapRepositoryError(recipients.error)

    return ok({
      notificationId: sent.value.notificationId,
      recipientCount: recipients.value,
      phoneNumber:
        audience.value.type === 'PHONE_NUMBER' && sent.value.delivery
          ? sent.value.delivery
          : undefined,
    })
  }

  /**
   * The preview before a send. A phone list with malformed entries still counts
   * the well-formed ones and reports the rest, so the form can point at them.
   */
  async countAudience(audience: AdminNotificationAudience) {
    let invalidPhoneNumbers: string[] = []
    let pipelineAudience
    if (audience.type === 'PHONE_NUMBER') {
      const { valid, invalid } = normalizePhoneNumbers(audience.phoneNumbers)
      invalidPhoneNumbers = invalid
      if (valid.length === 0) {
        return ok({
          userCount: 0,
          pushReachableCount: 0,
          invalidPhoneNumbers,
        } satisfies AdminCountNotificationAudienceResponse)
      }
      pipelineAudience = { type: 'PHONE_NUMBER' as const, details: valid }
    } else {
      const resolved = toPipelineAudience(audience)
      if (resolved.isErr()) {
        return ok({ userCount: 0, pushReachableCount: 0, invalidPhoneNumbers })
      }
      pipelineAudience = resolved.value
    }

    const counted = await this.notificationRepository.countAudience(pipelineAudience)
    if (counted.isErr()) return mapRepositoryError(counted.error)

    return ok({
      ...counted.value,
      invalidPhoneNumbers,
    } satisfies AdminCountNotificationAudienceResponse)
  }

  async listRoles() {
    const roles = await this.sentRepository.listRoles()
    if (roles.isErr()) return mapRepositoryError(roles.error)
    return ok(roles.value)
  }

  async listSent(query: { page?: number; limit?: number }) {
    const page = query.page ?? 1
    const limit = query.limit ?? 10
    const result = await this.sentRepository.listSent({ page, limit })
    if (result.isErr()) return mapRepositoryError(result.error)

    const now = this.now()
    return ok({
      data: result.value.rows.map((row) => toSummary(row, now)),
      meta: { count: result.value.count },
    } satisfies AdminListSentNotificationsResponse)
  }

  async getSent(notificationId: string) {
    const result = await this.sentRepository.getSent(notificationId)
    if (result.isErr()) return mapRepositoryError(result.error)
    if (!result.value) {
      return err({
        code: InternalErrorCode.NOTIFICATION_NOT_FOUND,
        message: 'Notification not found',
      })
    }

    const { row, readCount, actionCounts } = result.value
    const spec = isStoredInteraction(row.interaction) ? row.interaction : null

    return ok({
      ...toSummary(row, this.now()),
      image: row.image,
      actionButtonText: row.actionButtonText,
      link: toSentLink(row),
      interaction: spec
        ? {
            fields: spec.fields,
            actions: spec.actions,
            tray: spec.tray,
            liveActivity: spec.liveActivity === true,
            expiresAt: row.interactionExpiresAt,
            closedAt: row.interactionClosedAt,
            actionCounts: spec.actions.map((action) => ({
              actionId: action.id,
              count: actionCounts.get(action.id) ?? 0,
            })),
          }
        : null,
      readCount,
    } satisfies AdminSentNotificationDetail)
  }

  async listResponses(notificationId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const result = await this.sentRepository.listResponses(notificationId, { page, limit })
    if (result.isErr()) return mapRepositoryError(result.error)
    if (!result.value) {
      return err({
        code: InternalErrorCode.NOTIFICATION_NOT_FOUND,
        message: 'Notification not found',
      })
    }

    return ok({
      data: result.value.rows.map((row) => ({
        id: row.id,
        user: {
          id: row.user.id,
          name: row.user.name,
          phoneNumber: row.user.phoneNumber,
        },
        actionId: row.actionId,
        values: (row.values as Record<string, string | string[]> | null) ?? null,
        channel: row.channel,
        respondedAt: row.respondedAt,
      })),
      meta: { count: result.value.count },
    } satisfies AdminListNotificationResponsesResponse)
  }
}
