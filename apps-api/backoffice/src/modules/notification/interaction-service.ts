import { InternalErrorCode } from '@pple-today/api-common/dtos'
import type { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import type { Prisma } from '@pple-today/database/prisma'
import { NotificationResponseChannel } from '@pple-today/database/prisma'
import { err, ok } from 'neverthrow'

import type { NotificationCallbackDispatcher } from './callback-delivery'
import { deriveInteractionState, validateAnswer } from './interaction'
import {
  type InteractionRow,
  isAppGone,
  isStoredInteraction,
  readClientInteraction,
} from './interaction-read'
import type { InteractionRepository } from './interaction-repository'
import { verifyResponseToken } from './response-token'

/** The one thing the service needs from FCM; kept narrow so tests need no config graph. */
export interface DismissSender {
  sendDismiss(tokens: string[], notificationId: string): Promise<{ isErr(): boolean }>
}

/** How the caller proved who they are: the session (in-app) or a tray response token. */
export type ResponseCredential =
  | { kind: 'session'; userId: string }
  | { kind: 'token'; token: string }

const notFound = () =>
  err({
    code: InternalErrorCode.NOTIFICATION_NOT_FOUND,
    message: 'Notification not found',
  })

/**
 * Answering, and closing, interactive notifications
 * (docs/interactive-notifications.md, "Wire format — answering in the app").
 *
 * Both are refused with `INTERACTIVE_NOTIFICATIONS_DISABLED` while
 * `INTERACTIVE_NOTIFICATIONS_ENABLED` is off, so the flag works as a kill switch
 * for the whole feature. Reading is not gated: an interaction that already exists
 * keeps rendering (it just cannot be answered).
 *
 * Kept free of Elysia/config imports so it can be unit-tested without booting the
 * app's config graph; the plugin wiring lives in `services.ts`.
 */
export class InteractionService {
  constructor(
    private readonly interactionRepository: InteractionRepository,
    private readonly cloudMessagingService: DismissSender,
    private readonly callbackDispatcher: NotificationCallbackDispatcher,
    private readonly loggerService: ElysiaLoggerInstance,
    private readonly options: {
      interactiveNotificationsEnabled: boolean
      /** `NOTIFICATION_RESPONSE_TOKEN_SECRET`. Unset: no token can be verified, so every token is a 401. */
      responseTokenSecret?: string
      /** `NOTIFICATION_RESPONSE_TOKEN_SECRET_PREVIOUS`: still verifies tokens minted before a rotation; never used to mint. */
      responseTokenSecretPrevious?: string
    },
    /** Injected so expiry is testable without a fake timer. */
    private readonly now: () => Date = () => new Date()
  ) {}

  private disabled() {
    return err({
      code: InternalErrorCode.INTERACTIVE_NOTIFICATIONS_DISABLED,
      message: 'Interactive notifications are not enabled.',
    })
  }

  /**
   * Record one recipient's answer.
   *
   * The same checks run whichever credential is used, in this order, so the
   * first failing one names the response: token (401; bad signature, expired,
   * another notification, or no longer a device of that user), recipient / has
   * an interaction (404), already answered (409), closed / expired / app retired
   * or deleted (410), then the answer itself against the stored spec (400).
   *
   * On success it records the answer and marks the notification read in one
   * transaction. After that commits it starts one callback attempt and sends the
   * dismiss push, and does not wait for either: the user's request never depends
   * on the app's server or on FCM.
   */
  async respond(
    notificationId: string,
    credential: ResponseCredential,
    body: { actionId: string; values?: Record<string, unknown> }
  ) {
    if (!this.options.interactiveNotificationsEnabled) return this.disabled()

    let userId: string
    let channel: NotificationResponseChannel
    if (credential.kind === 'session') {
      userId = credential.userId
      channel = NotificationResponseChannel.APP
    } else {
      const { responseTokenSecret, responseTokenSecretPrevious } = this.options
      const secrets = [responseTokenSecret, responseTokenSecretPrevious].filter((s): s is string =>
        Boolean(s)
      )
      const verified =
        secrets.length > 0 ? verifyResponseToken(credential.token, secrets, this.now()) : null
      const invalidToken = () =>
        err({
          code: InternalErrorCode.NOTIFICATION_RESPONSE_TOKEN_INVALID,
          message: 'The response token is invalid or has expired',
        })
      // A token for another notification is as good as a bad one: it authorises
      // exactly one thing.
      if (!verified?.ok || verified.notificationId !== notificationId) return invalidToken()
      // The token is bound to the device it was pushed to: the user must still
      // have that device registered. Logging in as someone else on the device
      // re-registers it to them, which kills the previous user's tokens.
      const device = await this.interactionRepository.hasDeviceWithHash(
        verified.userId,
        verified.deviceHash
      )
      if (device.isErr()) return mapRepositoryError(device.error)
      if (!device.value) return invalidToken()
      userId = verified.userId
      channel = NotificationResponseChannel.TRAY
    }

    const loaded = await this.interactionRepository.getForResponse(userId, notificationId)
    if (loaded.isErr()) return mapRepositoryError(loaded.error)
    const notification = loaded.value
    // Missing, not a recipient and no interaction all answer the same.
    if (!notification || !isStoredInteraction(notification.interaction)) return notFound()
    const spec = notification.interaction
    const now = this.now()

    const state = deriveInteractionState({
      hasResponse: notification.responses.length > 0,
      closedAt: notification.interactionClosedAt,
      expiresAt: notification.interactionExpiresAt,
      // No app (deleted) reads like a retired one: closed.
      appGone: isAppGone(notification.miniApp),
      now,
    })
    if (state === 'RESPONDED') return this.alreadyResponded(notification, now)
    if (state === 'CLOSED' || state === 'EXPIRED') {
      return err({
        code: InternalErrorCode.NOTIFICATION_INTERACTION_CLOSED,
        message:
          state === 'EXPIRED' ? 'This interaction has expired' : 'This interaction is closed',
      })
    }

    const answer = validateAnswer(spec, body)
    if (!answer.ok) {
      return err({
        code: InternalErrorCode.NOTIFICATION_RESPONSE_INVALID,
        message: `${answer.path}: ${answer.message}`,
      })
    }

    // The checks above ran on a read; the insert re-checks under a row lock, so
    // a close that lands in between wins.
    const created = await this.interactionRepository.createResponse({
      notificationId,
      userId,
      actionId: answer.actionId,
      values: answer.values as Prisma.InputJsonValue | undefined,
      channel,
      now,
    })
    if (created.isErr()) {
      // Lost the race to another device or a double tap: the unique key held.
      if (created.error.code === 'UNIQUE_CONSTRAINT_FAILED') {
        return this.alreadyRespondedAfterRace(notification, userId, notificationId, now)
      }
      return mapRepositoryError(created.error)
    }
    if (created.value.status !== 'CREATED') {
      return err({
        code: InternalErrorCode.NOTIFICATION_INTERACTION_CLOSED,
        message:
          created.value.status === 'EXPIRED'
            ? 'This interaction has expired'
            : 'This interaction is closed',
      })
    }
    const response = created.value.response

    // After the commit, and neither awaited: a throw here must not turn a
    // recorded answer into a failed request.
    try {
      this.callbackDispatcher.dispatchSoon(response.id)
    } catch (e) {
      this.loggerService.error({
        message: 'Failed to start the callback attempt for a notification response',
        details: e,
      })
    }
    void this.dismissOnTrayDevices(userId, notificationId)

    const interaction = readClientInteraction({ ...notification, responses: [response] }, now, {
      enabled: true,
    })
    // Unreachable: the spec was read above. Kept so the type is honest.
    if (!interaction) return notFound()
    return ok({ interaction })
  }

  private alreadyResponded(notification: InteractionRow, now: Date) {
    const interaction = readClientInteraction(notification, now, { enabled: true })
    if (!interaction) return notFound()
    return err({
      code: InternalErrorCode.NOTIFICATION_ALREADY_RESPONDED,
      message: 'You have already responded to this notification',
      data: { interaction },
    })
  }

  private async alreadyRespondedAfterRace(
    notification: InteractionRow,
    userId: string,
    notificationId: string,
    now: Date
  ) {
    const existing = await this.interactionRepository.getResponse(userId, notificationId)
    if (existing.isErr()) return mapRepositoryError(existing.error)
    return this.alreadyResponded(
      { ...notification, responses: existing.value ? [existing.value] : [] },
      now
    )
  }

  /**
   * Tell the user's Android tray devices to drop the card. The device that
   * answered is not excluded because the server cannot know which it was; it
   * already removed its own card, so the dismiss is a no-op there. iOS gets none.
   * Failures are logged and swallowed.
   */
  async dismissOnTrayDevices(userId: string, notificationId: string) {
    try {
      const tokens = await this.interactionRepository.getTrayDismissTokens(userId)
      if (tokens.isErr()) {
        this.loggerService.error({
          message: 'Failed to look up tray devices for a dismiss push',
          details: tokens.error,
        })
        return
      }
      if (tokens.value.length === 0) return
      const sent = await this.cloudMessagingService.sendDismiss(tokens.value, notificationId)
      if (sent.isErr()) {
        this.loggerService.error({
          message: 'Failed to send a dismiss push',
          notificationId,
          details: sent,
        })
      }
    } catch (e) {
      this.loggerService.error({ message: 'Failed to send a dismiss push', details: e })
    }
  }

  /**
   * Stop accepting answers ("first approver wins"). Idempotent: closing a closed
   * interaction returns the original close time. Only the attributed app may
   * close; an unbound key, another app's notification, a missing id and a
   * notification with no interaction are all the same 404, so the endpoint
   * cannot be used to probe other apps' ids. Answers already recorded are still
   * delivered. No dismiss is sent to recipients: a stale card answers 410.
   */
  async closeInteraction(key: { miniApp: { id: string } | null }, notificationId: string) {
    if (!this.options.interactiveNotificationsEnabled) return this.disabled()
    if (!key.miniApp) return notFound()

    const own = await this.interactionRepository.getOwnInteraction(notificationId, key.miniApp.id)
    if (own.isErr()) return mapRepositoryError(own.error)
    if (!own.value) return notFound()
    if (own.value.interactionClosedAt) return ok({ closedAt: own.value.interactionClosedAt })

    const closed = await this.interactionRepository.closeInteraction(notificationId, this.now())
    if (closed.isErr()) return mapRepositoryError(closed.error)
    return ok({ closedAt: closed.value })
  }
}
