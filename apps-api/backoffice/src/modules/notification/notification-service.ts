import { InternalErrorCode } from '@pple-today/api-common/dtos'
import {
  isThaiMobileE164,
  mapRepositoryError,
  normalizeThaiPhoneNumber,
} from '@pple-today/api-common/utils'
import type { NotificationTokenPlatform } from '@pple-today/database/prisma'
import { err, ok } from 'neverthrow'

import { readClientInteraction } from './interaction-read'
import { type CallbackSendConfig, prepareInteractionSend } from './interaction-send'
import type { BoundApp } from './key-binding'
import type {
  CreateNewExternalNotificationBody,
  GetNotificationDetailsByIdResponse,
  ListHistoryNotificationResponse,
} from './models'
import type { NotificationRepository } from './repository'
import { resolveAppLinkPath } from './resolve-app-link-path'

/**
 * The sending app as the client renders it. A notification with no app is PPLE
 * Today's own and keeps the platform bell, so `undefined` is the answer rather
 * than a placeholder name.
 */
const toSenderApp = (miniApp: { name: string; icon: string | null; slug: string } | null) =>
  miniApp
    ? { name: miniApp.name, iconUrl: miniApp.icon ?? undefined, slug: miniApp.slug }
    : undefined

/**
 * The central-team notification surface: history, read state, device tokens and
 * the raw-targeting external send.
 *
 * Kept free of Elysia/config imports so it can be unit-tested without booting
 * the app's config graph; the plugin wiring lives in `services.ts`. (Audience-
 * bound sends for Builder Apps live in `AppNotificationService` instead.)
 */
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    /**
     * Public origin of the mini-app redirect host. A path destination on a raw
     * send is joined to `{origin}/{slug}` before it is stored, so the phone
     * opens the same URL an app-bound `linkPath` produces.
     */
    private readonly miniAppRedirectOrigin: string,
    private readonly options: {
      /** `INTERACTIVE_NOTIFICATIONS_ENABLED`. While false a send with `interaction` is refused. */
      interactiveNotificationsEnabled?: boolean
      /** Relay and secret-key config the send-time callback check mirrors. */
      callbackConfig?: CallbackSendConfig
      /** Injected so interaction state is testable without a fake timer. */
      now?: () => Date
    } = {}
  ) {}

  private interactionsEnabled() {
    return { enabled: this.options.interactiveNotificationsEnabled ?? false }
  }

  private now() {
    return this.options.now?.() ?? new Date()
  }

  /**
   * Resolve a presented API key, or null when it is unknown or deactivated.
   *
   * Returns the whole record rather than just its id: the app a key is bound to
   * decides which send path it may use, whether it is metered, and whose name
   * and icon the notification carries — so every caller has to see it at the
   * point it authenticates.
   */
  async checkApiToken(apiToken: string) {
    const isValid = await this.notificationRepository.checkApiKey(apiToken)

    if (isValid.isErr()) {
      return mapRepositoryError(isValid.error)
    }

    return ok(isValid.value)
  }

  async listNotifications(userId: string, cursor?: string, limit?: number) {
    const listResult = await this.notificationRepository.listNotifications(userId, cursor, limit)

    if (listResult.isErr()) {
      return mapRepositoryError(listResult.error)
    }

    const now = this.now()
    const notifications: ListHistoryNotificationResponse['items'] =
      listResult.value.notifications.map(({ notification, isRead, createdAt }) => ({
        id: notification.id,
        title: notification.title,
        description: notification.message ?? undefined,
        image: notification.image ?? undefined,
        app: toSenderApp(notification.miniApp),
        interactionState: readClientInteraction(notification, now, this.interactionsEnabled())
          ?.state,
        isRead,
        createdAt,
      }))

    return ok({
      items: notifications,
      meta: {
        cursor: {
          next: listResult.value.nextCursor,
          previous: listResult.value.previousCursor,
        },
      },
    })
  }

  async getNotificationDetailsById(userId: string, notificationId: string) {
    const getResult = await this.notificationRepository.getNotificationDetailsById(
      userId,
      notificationId
    )

    if (getResult.isErr()) {
      return mapRepositoryError(getResult.error)
    }

    const notification = getResult.value
    const notificationDetails = notification.notification

    const linkBypassFields =
      notificationDetails.linkBypassNotificationCenter != null
        ? { bypassNotificationCenter: notificationDetails.linkBypassNotificationCenter }
        : {}

    return ok({
      id: notificationDetails.id,
      app: toSenderApp(notificationDetails.miniApp),
      content: {
        header: notificationDetails.title,
        message: notificationDetails.message ?? undefined,
        image: notificationDetails.image ?? undefined,
        actionButtonText:
          notificationDetails.linkType && notificationDetails.actionButtonText
            ? notificationDetails.actionButtonText
            : undefined,
        link: !notificationDetails.linkType
          ? undefined
          : notificationDetails.linkType === 'EXTERNAL_BROWSER' ||
              notificationDetails.linkType === 'MINI_APP'
            ? {
                type: notificationDetails.linkType,
                destination: notificationDetails.linkDestination!,
                ...linkBypassFields,
              }
            : {
                type: 'IN_APP_NAVIGATION',
                destination: {
                  inAppType: notificationDetails.linkInAppType!,
                  inAppId: notificationDetails.linkInAppId!,
                },
                ...linkBypassFields,
              },
      },
      // An existing interaction keeps rendering while the flag is off, but as
      // CLOSED (unless already answered): nothing can be answered then.
      interaction: readClientInteraction(
        notificationDetails,
        this.now(),
        this.interactionsEnabled()
      ),
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    } satisfies GetNotificationDetailsByIdResponse)
  }

  /**
   * Forgets this device for this user (logout). Removing the row also invalidates
   * every tray response token minted for the device, since a token is bound to
   * its device registration.
   */
  async unregisterDeviceToken(userId: string, deviceToken: string) {
    const result = await this.notificationRepository.unregisterDeviceToken(userId, deviceToken)
    if (result.isErr()) return mapRepositoryError(result.error)
    return ok()
  }

  async registerDeviceToken(
    userId: string,
    deviceToken: string,
    device: {
      platform?: NotificationTokenPlatform
      supportsAppBranding?: boolean
      supportsTrayInteraction?: boolean
    } = {}
  ) {
    const registerResult = await this.notificationRepository.registerDeviceToken(
      userId,
      deviceToken,
      device
    )

    if (registerResult.isErr()) {
      return mapRepositoryError(registerResult.error)
    }

    return ok()
  }

  /**
   * Whether the person behind a number has PPLE Today, and whether it can
   * actually reach them.
   *
   * A number that is not a Thai mobile answers both-false rather than erroring,
   * the same as a number nobody holds. The caller acts on the same thing either
   * way — there is no install to notify — and collapsing the two keeps this from
   * doubling as a way to probe which numbers are well-formed. It also means a
   * malformed number never reaches the database.
   *
   * The number is normalised first, so a caller may pass either the domestic
   * `0XXXXXXXXX` form or E.164, matching the send path's audience handling.
   */
  async getAppInstallStatus(rawPhoneNumber: string) {
    const phoneNumber = normalizeThaiPhoneNumber(rawPhoneNumber)

    if (!isThaiMobileE164(phoneNumber)) {
      return ok({ isAppInstalled: false, hasPushToken: false })
    }

    const result = await this.notificationRepository.getAppInstallStatus(phoneNumber)

    if (result.isErr()) {
      return mapRepositoryError(result.error)
    }

    return ok(result.value)
  }

  /**
   * The counts behind a broadcast preview: of these numbers, how many have a
   * PPLE Today account and how many can be reached by push.
   *
   * Each entry is normalised and checked exactly as `getAppInstallStatus` does
   * it, so the two endpoints cannot disagree about a number. Entries that are
   * not a Thai mobile are counted as `invalid` and never reach the database.
   * The rest are deduplicated after normalising — `0812345678` and
   * `+66812345678` are one person — so `total` is people, not rows in the
   * request, and the repository may rely on distinct input.
   *
   * Only counts are returned, never which numbers matched.
   */
  async countAppInstall(rawPhoneNumbers: string[]) {
    const valid = new Set<string>()
    let invalid = 0

    for (const raw of rawPhoneNumbers) {
      const phoneNumber = normalizeThaiPhoneNumber(raw)

      if (isThaiMobileE164(phoneNumber)) {
        valid.add(phoneNumber)
      } else {
        invalid += 1
      }
    }

    if (valid.size === 0) {
      return ok({ total: 0, withAccount: 0, withPushToken: 0, invalid })
    }

    const result = await this.notificationRepository.countAppInstall(Array.from(valid))

    if (result.isErr()) {
      return mapRepositoryError(result.error)
    }

    return ok({ total: valid.size, invalid, ...result.value })
  }

  async markAsRead(userId: string, notificationId: string) {
    const markResult = await this.notificationRepository.markAsRead(userId, notificationId)

    if (markResult.isErr()) {
      return mapRepositoryError(markResult.error)
    }

    return ok()
  }

  async markAllAsRead(userId: string) {
    const markResult = await this.notificationRepository.markAllAsRead(userId)

    if (markResult.isErr()) {
      return mapRepositoryError(markResult.error)
    }

    return ok()
  }

  /**
   * Decide which app a raw send is from.
   *
   * The admin key is the authorization and stays the key the usage log is
   * written against, so the send stays unmetered and the app's own quota is
   * never charged. An app key, when the caller sends one, replaces only the
   * attribution: the notification wears that app's name and icon. Who can be
   * reached does not change — the audience is still whatever the body names.
   *
   * No app key keeps today's rule: a bound admin key shows its own app, and an
   * unbound one sends as PPLE Today. `slug` is set only from the app key,
   * because a path destination such as `/approval/123` is completed with that
   * slug and must not silently use a different app.
   */
  async attributeSend(adminKey: { id: string; miniApp: BoundApp | null }, appKeyToken?: string) {
    const presented = appKeyToken?.trim()
    if (!presented) return ok({ ...adminKey, slug: null })

    const appKey = await this.checkApiToken(presented)
    if (appKey.isErr()) return err(appKey.error)
    if (!appKey.value) {
      return err({
        code: InternalErrorCode.UNAUTHORIZED,
        message: 'Invalid app key',
      })
    }
    if (!appKey.value.miniApp) {
      return err({
        code: InternalErrorCode.NOTIFICATION_KEY_NOT_APP_BOUND,
        message:
          'The app key is not bound to a mini app, so the notification has no app to show as its sender.',
      })
    }

    const { id, name, icon, slug } = appKey.value.miniApp

    return ok({ id: adminKey.id, miniApp: { id, name, icon }, slug })
  }

  /**
   * @param key The admin key this send is recorded against, and the app the
   *            notification is attributed to. The app is the admin key's own
   *            binding unless `attributeSend` replaced it with the app named
   *            by the accompanying app key. A key with no app attributes to
   *            nobody, and the notification stays PPLE Today's.
   */
  async sendExternalNotification(
    data: CreateNewExternalNotificationBody,
    key: { id: string; miniApp: BoundApp | null; slug?: string | null }
  ) {
    const content = this.resolveMiniAppPath(data.content, key.slug ?? null)
    if (content.isErr()) return err(content.error)

    // The attributed app is the one that gets called back, so an unbound key
    // (no app) cannot carry an interaction.
    const interaction = await prepareInteractionSend({
      input: data.interaction,
      enabled: this.options.interactiveNotificationsEnabled ?? false,
      bypass: content.value.link?.bypassNotificationCenter === true,
      app: key.miniApp,
      getCallbackTarget: (miniAppId) => this.notificationRepository.getCallbackTarget(miniAppId),
      callbackConfig: this.options.callbackConfig,
      now: this.now(),
    })
    if (interaction.isErr()) return err(interaction.error)

    const sendResult = await this.notificationRepository.sendNotificationToUser(
      data.audience,
      content.value,
      {
        apiKeyId: key.id,
        app: key.miniApp ?? undefined,
        smsFallbackText: data.smsFallbackText,
        interaction: interaction.value,
      }
    )

    if (sendResult.isErr()) {
      return mapRepositoryError(sendResult.error)
    }

    return ok(sendResult.value)
  }

  async getUnreadNotificationCount(userId: string) {
    const countResult = await this.notificationRepository.getUnreadNotificationCount(userId)

    if (countResult.isErr()) {
      return mapRepositoryError(countResult.error)
    }

    return ok(countResult.value)
  }

  /**
   * A `MINI_APP` destination that is only a path (`/approval/123`) is completed
   * with the app key's slug. The stored link is the full redirect URL the
   * phone already understands. A full URL is left as the caller wrote it.
   */
  private resolveMiniAppPath(
    content: CreateNewExternalNotificationBody['content'],
    slug: string | null
  ) {
    const link = content.link
    if (!link || link.type !== 'MINI_APP') return ok(content)

    const destination = link.destination
    if (!destination.startsWith('/') || destination.startsWith('//')) return ok(content)

    if (!slug) {
      return err({
        code: InternalErrorCode.NOTIFICATION_INVALID_LINK_PATH,
        message:
          'A path destination such as /approval/123 needs the app key in x-notification-app-key. The slug is taken from that key.',
      })
    }

    const resolved = resolveAppLinkPath(destination, { slug }, this.miniAppRedirectOrigin)
    if (resolved.isErr()) return err(resolved.error)

    return ok({
      ...content,
      link: { ...link, destination: resolved.value.destination },
    })
  }
}
