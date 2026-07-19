import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { err, ok } from 'neverthrow'

import { resolveAppAudience } from './app-audience'
import type { AppNotificationRepository } from './app-notification-repository'
import type { CreateNewExternalNotificationBody } from './models'
import { evaluateDailyQuota, quotaDayStart } from './quota'
import type { NotificationRepository } from './repository'

/** The notification key as the send path needs to see it. */
export interface AppBoundKey {
  id: string
  /** The app this key sends for. Null = a legacy central-team key. */
  miniAppId: string | null
  dailyQuota: number
}

/** The content an app may send. No audience — that is the whole point. */
export type AppNotificationContent = CreateNewExternalNotificationBody['content']

/**
 * Audience-bound sends: a Builder App supplies content, and the platform decides
 * who receives it.
 *
 * This is the privacy boundary of the whole notification model. An app-bound key
 * can express *what* to say and nothing about *whom* to say it to; recipients
 * are resolved here from the app's own App User registry, narrowed to its
 * current publication tier. An app therefore reaches the people who use it, and
 * has no way to learn or name anybody else.
 *
 * Kept free of Elysia/config imports so it can be unit-tested without booting
 * the app's config graph; the plugin wiring lives in `services.ts`.
 */
export class AppNotificationService {
  constructor(
    private readonly appNotificationRepository: AppNotificationRepository,
    private readonly notificationRepository: NotificationRepository,
    /** Injected so the quota window is testable without a fake timer. */
    private readonly now: () => Date = () => new Date()
  ) {}

  /**
   * Send one audience-bound notification.
   *
   * The order is deliberate: refuse unbound keys, resolve the audience, check
   * the budget, send, then meter. Metering *after* a successful send keeps the
   * usage log meaning what it has always meant — notifications that were
   * actually created — so an internal failure never costs the Builder part of
   * their day's budget.
   *
   * The check and the meter are not atomic, so concurrent sends can each pass
   * the check and land slightly over quota. The window is a day and the
   * overshoot is bounded by concurrency, so this is deliberately left as an
   * advisory limit rather than paying for a lock on every send.
   */
  async send(key: AppBoundKey, content: AppNotificationContent) {
    if (key.miniAppId === null) {
      return err({
        code: InternalErrorCode.NOTIFICATION_KEY_NOT_APP_BOUND,
        message:
          'This notification key is not bound to a mini app, so it has no audience to resolve. Use the raw-targeting endpoint instead.',
      })
    }

    const audienceInput = await this.appNotificationRepository.getAudienceInput(key.miniAppId)
    if (audienceInput.isErr()) {
      return mapRepositoryError(audienceInput.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.MINI_APP_NOT_FOUND,
          message: 'The mini app this notification key is bound to no longer exists',
        },
      })
    }

    const now = this.now()
    const usedResult = await this.appNotificationRepository.countUsageSince(
      key.id,
      quotaDayStart(now)
    )
    if (usedResult.isErr()) return mapRepositoryError(usedResult.error)

    const quota = evaluateDailyQuota({
      used: usedResult.value,
      dailyQuota: key.dailyQuota,
      now,
    })

    if (!quota.allowed) {
      return err({
        code: InternalErrorCode.NOTIFICATION_QUOTA_EXCEEDED,
        message: `Daily notification quota of ${quota.dailyQuota} exhausted. It resets at ${quota.resetAt.toISOString()}.`,
        data: {
          dailyQuota: quota.dailyQuota,
          remaining: quota.remaining,
          resetAt: quota.resetAt.toISOString(),
        },
      })
    }

    const recipients = resolveAppAudience(audienceInput.value)

    // An audience of nobody has no notification to create — creating one would
    // leave a row addressed to no one. The request is still metered: it is a
    // send the app asked for, and not metering it would leave a free path.
    if (recipients.length > 0) {
      const sendResult = await this.notificationRepository.sendNotificationToUser(
        { type: 'USER_ID', details: recipients },
        content,
        // The usage log below is this path's meter, and it records content only.
        // Letting the shared path log as well would both double-count the send
        // and copy the resolved recipients into the log.
        undefined
      )

      if (sendResult.isErr()) return mapRepositoryError(sendResult.error)
    }

    const usageResult = await this.appNotificationRepository.recordUsage(key.id, {
      // The audience is recorded as the app it was derived from, never as the
      // list of people it resolved to.
      audience: { type: 'APP_USERS', miniAppId: key.miniAppId },
      data: content,
    })
    if (usageResult.isErr()) return mapRepositoryError(usageResult.error)

    return ok({
      recipientCount: recipients.length,
      dailyQuota: quota.dailyQuota,
      // This send has now been spent, so report what is left after it.
      remaining: Math.max(quota.remaining - 1, 0),
      resetAt: quota.resetAt.toISOString(),
    })
  }

  /**
   * Set the daily quota on an app's notification key — how the platform applies
   * an approved LimitRequest. Scoped to active keys, so a retired app's
   * deactivated key cannot be quietly given a fresh budget.
   */
  async setDailyQuota(miniAppId: string, dailyQuota: number) {
    const result = await this.appNotificationRepository.setDailyQuota(miniAppId, dailyQuota)
    if (result.isErr()) return mapRepositoryError(result.error)

    if (result.value === 0) {
      return err({
        code: InternalErrorCode.NOTIFICATION_API_KEY_NOT_FOUND,
        message: 'This mini app has no active notification key',
      })
    }

    return ok({ dailyQuota })
  }
}
