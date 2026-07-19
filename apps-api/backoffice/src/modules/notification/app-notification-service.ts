import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { err, ok } from 'neverthrow'

import { resolveAppAudience } from './app-audience'
import type { AppNotificationRepository } from './app-notification-repository'
import { requireAppBoundKey } from './key-binding'
import type { CreateAppNotificationBody } from './models'
import { evaluateDailyQuota, quotaDayStart } from './quota'
import type { NotificationRepository } from './repository'
import { resolveAppLinkPath } from './resolve-app-link-path'

/** The notification key as the send path needs to see it. */
export interface AppBoundKey {
  id: string
  /** The app this key sends for. Null = a legacy central-team key. */
  miniAppId: string | null
  dailyQuota: number
}

/**
 * The content an app may send. No audience — that is the whole point — and no
 * free-form `link` either: derived from the *app* body rather than the external
 * one, so the type cannot admit a cross-app destination. Optional self-links
 * arrive as `linkPath` and are resolved here into a normal `MINI_APP` link.
 */
export type AppNotificationContent = CreateAppNotificationBody['content']

/** Content as handed to the shared send pipeline after any self-link is resolved. */
type AppNotificationSendContent = AppNotificationContent & {
  link?: { type: 'MINI_APP'; destination: string }
}

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
    /**
     * Public origin of the mini-app redirect host. Joined with the app's slug
     * (and optional linkPath) to form a `MINI_APP` destination the mobile
     * client already understands. Injected so tests never boot the config graph.
     */
    private readonly miniAppRedirectOrigin: string,
    /** Injected so the quota window is testable without a fake timer. */
    private readonly now: () => Date = () => new Date()
  ) {}

  /**
   * Send one audience-bound notification.
   *
   * The order is deliberate: refuse unbound keys, resolve the audience, resolve
   * any self-link, claim a quota slot, send, and release the claim if the send
   * fails. Claiming *before* the send (atomically against the usage log) keeps
   * concurrent last-slot sends from both landing; releasing on failure keeps
   * the usage log meaning what it has always meant — notifications that were
   * actually created — so an internal failure never costs the Builder part of
   * their day's budget. An invalid `linkPath` fails before the claim so junk
   * never costs budget.
   */
  async send(key: AppBoundKey, content: AppNotificationContent, linkPath?: string) {
    const boundKey = requireAppBoundKey(key)
    if (boundKey.isErr()) return err(boundKey.error)

    const audienceInput = await this.appNotificationRepository.getAudienceInput(
      boundKey.value.miniAppId
    )
    if (audienceInput.isErr()) {
      return mapRepositoryError(audienceInput.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.MINI_APP_NOT_FOUND,
          message: 'The mini app this notification key is bound to no longer exists',
        },
      })
    }

    let sendContent: AppNotificationSendContent = content
    if (linkPath !== undefined) {
      const linkResult = resolveAppLinkPath(
        linkPath,
        { slug: audienceInput.value.slug },
        this.miniAppRedirectOrigin
      )
      if (linkResult.isErr()) return err(linkResult.error)
      sendContent = { ...content, link: linkResult.value }
    }

    const now = this.now()
    // Stringified to match how the raw-targeting path has always written this
    // column (`sendNotificationToUser`), so the usage log stays one shape and
    // a reader never has to branch on which path wrote the row. The audience is
    // recorded as the app it was derived from, never as the list of people it
    // resolved to. Claimed up front so the body is ready before send.
    const usageBody = JSON.stringify({
      audience: { type: 'APP_USERS', miniAppId: boundKey.value.miniAppId },
      data: sendContent,
    })

    // Quota accounting is a single transactional claim so concurrent sends
    // cannot both squeeze past the last remaining slot.
    const claimResult = await this.appNotificationRepository.claimUsageUnderQuota(
      key.id,
      key.dailyQuota,
      quotaDayStart(now),
      usageBody
    )
    if (claimResult.isErr()) return mapRepositoryError(claimResult.error)

    if (claimResult.value.status === 'quota_exceeded') {
      const quota = evaluateDailyQuota({
        used: claimResult.value.used,
        dailyQuota: key.dailyQuota,
        now,
      })
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

    const claim = claimResult.value
    const recipients = resolveAppAudience(audienceInput.value)

    // An audience of nobody has no notification to create — creating one would
    // leave a row addressed to no one. The claim still stands: it is a send the
    // app asked for, and not metering it would leave a free path.
    if (recipients.length > 0) {
      const sendResult = await this.notificationRepository.sendNotificationToUser(
        { type: 'USER_ID', details: recipients },
        sendContent,
        // The usage log above is this path's meter. Letting the shared path log
        // as well would both double-count the send and copy the resolved
        // recipients into the log.
        undefined
      )

      if (sendResult.isErr()) {
        const releaseResult = await this.appNotificationRepository.releaseUsage(claim.usageLogId)
        if (releaseResult.isErr()) return mapRepositoryError(releaseResult.error)
        return mapRepositoryError(sendResult.error)
      }
    }

    // `claim.used` includes this send; evaluate against the pre-claim count so
    // the pure quota rule keeps its "used before this send" contract.
    const quota = evaluateDailyQuota({
      used: claim.used - 1,
      dailyQuota: key.dailyQuota,
      now,
    })

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
