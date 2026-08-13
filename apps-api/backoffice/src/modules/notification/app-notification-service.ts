import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { err, ok } from 'neverthrow'

import { resolveAppAudience } from './app-audience'
import type { AppNotificationRepository } from './app-notification-repository'
import {
  canonicalizeRecipients,
  type CanonicalRecipient,
  phonesToResolve,
  settleDirectDelivery,
} from './direct-recipients'
import { type BoundApp, isMeteredKey, requireAppBoundKey } from './key-binding'
import type { CreateAppNotificationBody, DirectRecipientResult } from './models'
import { evaluateDailyQuota, quotaDayEnd, quotaDayStart } from './quota'
import type { NotificationRepository } from './repository'
import { resolveAppLinkPath } from './resolve-app-link-path'

/** The notification key as the send path needs to see it. */
export interface AppBoundKey {
  id: string
  /** The app this key speaks for. Null = a legacy unbound key. */
  miniApp: BoundApp | null
  dailyQuota: number
}

/**
 * The content an app may send. Uniform across recipients — one notification
 * addressed to several people, not several notifications in one call — and with
 * no free-form `link`: derived from the *app* body rather than the external one,
 * so the type cannot admit a cross-app destination. Optional self-links arrive
 * as `linkPath` and are resolved here into a normal `MINI_APP` link.
 */
export type AppNotificationContent = CreateAppNotificationBody['content']

/** Content as handed to the shared send pipeline after any self-link is resolved. */
type AppNotificationSendContent = AppNotificationContent & {
  link?: { type: 'MINI_APP'; destination: string }
}

/**
 * Who this call reaches, what it costs, and what to report — the one shape both
 * audiences reduce to, so metering and delivery never have to branch on which
 * one was asked for.
 *
 * `results` is spelled in terms of the wire schema rather than the settlement
 * module's own type, so nothing about how recipients are resolved leaks into
 * the API surface the mobile client infers from these routes.
 */
interface SendPlan {
  /** Distinct people to actually create a notification for. */
  deliverTo: string[]
  /** What this call debits: the reach it requested, after de-duplication. */
  units: number
  /** The per-call audit record. Counts only — never who they were. */
  audit: { named: number; delivered: number; matchRatio: number }
  /** Per-recipient outcomes, for a `direct` send only. */
  results?: DirectRecipientResult[]
}

/** What a usage-log row has to carry to answer a retry without re-sending. */
interface StoredSendResult {
  recipientCount: number
  statuses?: DirectRecipientResult['status'][]
}

/**
 * A broadcast as the same plan a named send produces.
 *
 * A broadcast debits the audience size at send time, so the reach it requests
 * and the reach it achieves are the same number — which is why `named`,
 * `delivered` and `units` all agree here. An audience of nobody costs nothing
 * and reaches nobody; there is no delivery to charge for.
 */
const broadcastPlan = (audience: string[]): SendPlan => ({
  deliverTo: audience,
  units: audience.length,
  audit: {
    named: audience.length,
    delivered: audience.length,
    matchRatio: audience.length > 0 ? 1 : 0,
  },
})

/**
 * Settle a named list against the audience, resolving phones only among people
 * the app may actually reach.
 *
 * The intersection is applied to the phone map *before* settlement rather than
 * after, so an App User who has since fallen outside the tier (an invite
 * withdrawn, an app narrowed back to Draft) resolves to nobody rather than to
 * somebody who is then filtered out.
 */
const settleWith = (
  recipients: CanonicalRecipient[],
  audience: string[],
  subsByPhone: ReadonlyMap<string, string>
): SendPlan => {
  const reachable = new Set(audience)

  return settleDirectDelivery(recipients, {
    reachable,
    subByPhone: new Map(Array.from(subsByPhone).filter(([, sub]) => reachable.has(sub))),
  })
}

/** The quota fields, or nothing at all when the key is not held to a budget. */
const remainingBudget = (meteredKey: AppBoundKey | undefined, used: number, now: Date) =>
  meteredKey
    ? {
        dailyQuota: meteredKey.dailyQuota,
        // `used` already includes this send, so this is what is left after it.
        remaining: Math.max(meteredKey.dailyQuota - used, 0),
        resetAt: quotaDayEnd(now).toISOString(),
      }
    : // The quota fields fall away as a group — inventing one would put a cap in
      // the response that nothing enforces.
      { dailyQuota: undefined, remaining: undefined, resetAt: undefined }

/** Read back a usage row's stored outcome, or `null` if it is not one. */
const parseStoredResult = (storedBody: unknown): StoredSendResult | null => {
  try {
    const parsed = typeof storedBody === 'string' ? JSON.parse(storedBody) : storedBody
    const result = (parsed as { result?: StoredSendResult } | null)?.result

    return typeof result?.recipientCount === 'number' ? result : null
  } catch {
    return null
  }
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
   * Send one audience-bound notification, to the app's whole audience or to a
   * named subset of it.
   *
   * The order is deliberate: refuse unbound keys, refuse a recipient list that
   * cannot be honoured, resolve the audience, resolve any self-link, settle who
   * is actually reachable, claim the budget, send, and release the claim if the
   * send fails.
   *
   * Claiming *before* the send (atomically against the usage log) keeps
   * concurrent last-budget sends from both landing, and makes the refusal
   * all-or-nothing: insufficient quota is a 429 with **nothing delivered**,
   * because a partial send the caller retries would double-notify everyone it
   * already reached. Releasing on failure keeps the usage log meaning what it
   * has always meant — notifications that were actually created — so an
   * internal failure never costs the Builder part of their day's budget. An
   * invalid `linkPath` or recipient list fails before the claim, so junk never
   * costs budget.
   *
   * A key bound to a central-team app is never *held* to the quota: the daily
   * budget is a *Builder App Resource Limit*, and a central-team app is not an
   * outside Builder. It is still *recorded*, because the audit trail is
   * per-call and the platform cannot write it itself — this send is
   * authenticated by the app's own key and never traverses the platform.
   */
  async send(key: AppBoundKey, body: CreateAppNotificationBody) {
    const boundKey = requireAppBoundKey(key)
    if (boundKey.isErr()) return err(boundKey.error)

    const app = boundKey.value.miniApp

    // Refused before any lookup and before any budget is touched: a malformed
    // list must never resolve into a *different*, wider send. Undefined here is
    // a broadcast — the audience the app has always been able to reach.
    let named: CanonicalRecipient[] | undefined
    if (body.audience.kind === 'direct') {
      const canonical = canonicalizeRecipients(body.audience.recipients)
      if (canonical.isErr()) return err(canonical.error)
      named = canonical.value
    }

    const audienceInput = await this.appNotificationRepository.getAudienceInput(app.id)
    if (audienceInput.isErr()) {
      return mapRepositoryError(audienceInput.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.MINI_APP_NOT_FOUND,
          message: 'The mini app this notification key is bound to no longer exists',
        },
      })
    }

    let sendContent: AppNotificationSendContent = body.content
    if (body.linkPath !== undefined) {
      const linkResult = resolveAppLinkPath(
        body.linkPath,
        { slug: audienceInput.value.slug },
        this.miniAppRedirectOrigin
      )
      if (linkResult.isErr()) return err(linkResult.error)
      sendContent = { ...body.content, link: linkResult.value }
    }

    // The same audience a broadcast resolves to, whether or not recipients were
    // named — which is what makes naming a narrowing and never a widening.
    const audience = resolveAppAudience(audienceInput.value)

    const planResult = named
      ? await this.settleNamedSend(app.id, named, audience)
      : ok(broadcastPlan(audience))
    if (planResult.isErr()) return mapRepositoryError(planResult.error)
    const plan = planResult.value

    const now = this.now()
    // The same predicate `getNotificationUsage` reports against, so what is
    // enforced here and what the Console shows cannot drift apart.
    const metered = isMeteredKey(boundKey.value)

    const storedResult: StoredSendResult = {
      recipientCount: plan.deliverTo.length,
      statuses: plan.results?.map((result) => result.status),
    }

    // Stringified to match how the raw-targeting path has always written this
    // column (`sendNotificationToUser`), so the usage log stays one shape and a
    // reader never has to branch on which path wrote the row.
    //
    // The audience is recorded as the app it was derived from and the audit as
    // counts — named, delivered, and the ratio between them. **No recipient
    // identities**, deliberately: this row is the only per-call record that
    // exists, and it must not accumulate into a per-person messaging history.
    // `statuses` is positional and carries no identity of its own; it is what
    // lets a retry be answered without re-sending.
    const usageBody = JSON.stringify({
      audience: {
        type: body.audience.kind === 'direct' ? 'APP_USERS_DIRECT' : 'APP_USERS',
        miniAppId: app.id,
      },
      data: sendContent,
      audit: plan.audit,
      result: storedResult,
    })

    // A single transactional claim, so concurrent sends cannot both squeeze
    // past the last of the budget and a repeat of an idempotency key is
    // recognised under the same lock.
    const claimResult = await this.appNotificationRepository.claimUsage({
      notificationApiKeyId: key.id,
      dailyQuota: metered ? key.dailyQuota : null,
      since: quotaDayStart(now),
      units: plan.units,
      body: usageBody,
      idempotencyKey: body.idempotencyKey,
    })
    if (claimResult.isErr()) return mapRepositoryError(claimResult.error)
    const claim = claimResult.value

    if (claim.status === 'quota_exceeded') {
      const quota = evaluateDailyQuota({ used: claim.used, dailyQuota: key.dailyQuota, now })
      return err({
        code: InternalErrorCode.NOTIFICATION_QUOTA_EXCEEDED,
        message: `Daily notification quota of ${quota.dailyQuota} exhausted; this send needs ${plan.units}, and ${quota.remaining} remain. It resets at ${quota.resetAt.toISOString()}.`,
        data: {
          dailyQuota: quota.dailyQuota,
          remaining: quota.remaining,
          resetAt: quota.resetAt.toISOString(),
        },
      })
    }

    // The call already landed. Answer from what it recorded rather than
    // delivering and charging a second time — that is the whole point of the
    // key, and re-resolving instead would report today's reachability for a
    // send that went out yesterday.
    if (claim.status === 'replayed') {
      return this.replay(claim.body, named, claim.used, metered ? key : undefined, now)
    }

    // An audience of nobody has no notification to create — creating one would
    // leave a row addressed to no one. The claim still stands: it is the reach
    // the app asked for, and refunding it would leave a free path.
    if (plan.deliverTo.length > 0) {
      const sendResult = await this.notificationRepository.sendNotificationToUser(
        { type: 'USER_ID', details: plan.deliverTo },
        sendContent,
        {
          // The usage log above is this path's meter. Letting the shared path
          // log as well would both double-count the send and copy the resolved
          // recipients into the log.
          app,
        }
      )

      if (sendResult.isErr()) {
        const releaseResult = await this.appNotificationRepository.releaseUsage(claim.usageLogId)
        if (releaseResult.isErr()) return mapRepositoryError(releaseResult.error)
        return mapRepositoryError(sendResult.error)
      }
    }

    return ok({
      recipientCount: plan.deliverTo.length,
      results: plan.results,
      ...remainingBudget(metered ? key : undefined, claim.used, now),
    })
  }

  /**
   * Work out who a *named* send actually reaches.
   *
   * Phone numbers are resolved inside the app's own App Users and nothing
   * wider, and the result is narrowed again to the tier audience before it is
   * used — so an entry naming somebody outside the app is never resolved to a
   * person at all, and there is no fact here that a later step would have to
   * remember not to disclose. One batched lookup rather than one per entry,
   * which also keeps `not_reachable` from being distinguishable by timing.
   */
  private async settleNamedSend(
    miniAppId: string,
    recipients: CanonicalRecipient[],
    audience: string[]
  ) {
    const phones = phonesToResolve(recipients)
    const subsByPhone = await this.appNotificationRepository.getAppUserSubsByPhone(
      miniAppId,
      phones
    )
    if (subsByPhone.isErr()) return err(subsByPhone.error)

    return ok(settleWith(recipients, audience, subsByPhone.value))
  }

  /**
   * Rebuild the answer a landed call already gave.
   *
   * The stored row holds outcomes but no identities, so the recipients are
   * taken from *this* request and zipped with them positionally. A key reused
   * with a different number of recipients cannot be zipped, and answering it
   * with the old outcomes would tell the caller who was reached under a list
   * they did not send — so it is a conflict rather than a best effort.
   */
  private replay(
    storedBody: unknown,
    recipients: { named: { sub?: string; phone?: string } }[] | undefined,
    used: number,
    meteredKey: AppBoundKey | undefined,
    now: Date
  ) {
    const stored = parseStoredResult(storedBody)
    if (!stored) {
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'The stored outcome for this idempotency key could not be read',
      })
    }

    const statuses = stored.statuses
    if ((statuses === undefined) !== (recipients === undefined)) {
      return err({
        code: InternalErrorCode.NOTIFICATION_IDEMPOTENCY_KEY_CONFLICT,
        message: 'This idempotency key was already used for a send to a different audience kind.',
      })
    }

    if (statuses && recipients && statuses.length !== recipients.length) {
      return err({
        code: InternalErrorCode.NOTIFICATION_IDEMPOTENCY_KEY_CONFLICT,
        message: `This idempotency key was already used for a send naming ${statuses.length} recipients; this call names ${recipients.length}.`,
      })
    }

    return ok({
      recipientCount: stored.recipientCount,
      results:
        statuses && recipients
          ? statuses.map((status, index) => ({ recipient: recipients[index].named, status }))
          : undefined,
      ...remainingBudget(meteredKey, used, now),
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

  /**
   * How many notifications the app has sent in the current Bangkok quota day,
   * and the budget that count is judged against — what the platform Console
   * Usage tile shows. Uses the same window and usage-log rows as the send path's
   * claim, so the tile and a 429 cannot disagree. An app with no active key is
   * not-found (unavailable on the platform side), distinct from zero sends today.
   *
   * `sent` is denominated in **deliveries**, not calls: a broadcast to 4,000 App
   * Users reads as 4,000, and a direct send to three people reads as three. This
   * is a change of meaning for the Console tile, and it is the same denomination
   * the daily budget is expressed in — so the tile and a 429 are talking about
   * the same number.
   *
   * `dailyQuota` falls away for an unmetered app, the same way the send response
   * drops its quota fields for one. An unmetered app's sends still write
   * usage-log rows — that is the audit trail, and it stays whole — so `sent` may
   * climb for an app no quota is ever claimed against. Reporting a cap alongside
   * it would show a number on the Console that nothing enforces, and one the
   * count can pass without anything happening.
   */
  async getNotificationUsage(miniAppId: string, now: Date = this.now()) {
    const result = await this.appNotificationRepository.getUsageSince(miniAppId, quotaDayStart(now))
    if (result.isErr()) return mapRepositoryError(result.error)

    if (result.value === null) {
      return err({
        code: InternalErrorCode.NOTIFICATION_API_KEY_NOT_FOUND,
        message: 'This mini app has no active notification key',
      })
    }

    const usage = result.value

    return ok({
      sent: usage.sent,
      dailyQuota: isMeteredKey(usage) ? usage.dailyQuota : undefined,
    })
  }
}
