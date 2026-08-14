import type { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import type { Prisma } from '@pple-today/database/prisma'
import { MiniAppInviteStatus } from '@pple-today/database/prisma'

import type { AppNotificationSendContext } from './app-audience'
import type { KeyBinding } from './key-binding'

/**
 * One app's spend in a quota window, with everything needed to read it: the
 * budget it is measured against and the binding that decides whether it is
 * measured at all. A `KeyBinding`, so the metering rule that governs a send
 * governs what is reported about it.
 */
export interface ActiveKeyUsage extends KeyBinding {
  /**
   * Deliveries logged in the window — the `units` `claimUsage` meters against.
   * Denominated in deliveries rather than calls, so a broadcast to 4,000 App
   * Users reads as 4,000 and a direct send to three people reads as three.
   */
  sent: number
  dailyQuota: number
}

/** One call's claim on a key's daily budget, and the audit row that records it. */
export interface UsageClaim {
  notificationApiKeyId: string
  /**
   * The budget to hold this call to, or `null` to record it without enforcing
   * one. Null is how an unmetered key still leaves an audit trail: the daily
   * quota is a Builder App Resource Limit, but *every* call on this path is
   * recorded, because the platform cannot log it itself — the send is
   * authenticated by the app's own key and never traverses the platform.
   */
  dailyQuota: number | null
  since: Date
  /** The reach this call requests: named recipients, or the broadcast audience. */
  units: number
  body: Prisma.InputJsonValue
  /** Client retry token. A repeat is answered from the stored row, not re-sent. */
  idempotencyKey?: string
}

/**
 * Persistence for audience-bound sends: who an app may reach, and how much of
 * its daily budget it has spent.
 *
 * Kept free of Elysia/config imports so it can be unit-tested without booting
 * the app's config graph; the plugin wiring lives in `services.ts`.
 */
export class AppNotificationRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Gather everything an audience-bound send needs for one app, in a single
   * round trip: its slug (for self-link resolution), tier and owner, its App
   * Users, and which of them hold an accepted invite. A missing app is a
   * `RECORD_NOT_FOUND`, not an empty audience — a key bound to an app that no
   * longer exists is a broken binding, not a quiet no-op.
   *
   * The App User registry is read whole because it *is* the audience bound; for
   * a Draft or Beta app it is a handful of rows, and for a Live app it is that
   * app's own user base, which is the same set the send has to write a
   * `UserNotification` for anyway.
   */
  async getAudienceInput(miniAppId: string) {
    return await fromRepositoryPromise(async () => {
      const miniApp = await this.prismaService.miniApp.findUniqueOrThrow({
        where: { id: miniAppId },
        select: {
          slug: true,
          tier: true,
          ownerSub: true,
          appUsers: { select: { userId: true } },
          invites: {
            where: { status: MiniAppInviteStatus.ACCEPTED, userId: { not: null } },
            select: { userId: true },
          },
        },
      })

      return {
        slug: miniApp.slug,
        tier: miniApp.tier,
        ownerSub: miniApp.ownerSub,
        appUserIds: miniApp.appUsers.map((appUser) => appUser.userId),
        acceptedInviteUserIds: new Set(
          miniApp.invites
            .map((invite) => invite.userId)
            .filter((userId): userId is string => userId !== null)
        ),
      } satisfies AppNotificationSendContext
    })
  }

  /**
   * Every App User of this app whose account holds one of `phones`, keyed by
   * number — how a direct send turns a phone into a person.
   *
   * Scoped to the app's own `MiniAppUser` rows on purpose. The platform never
   * asks its global directory whether an unknown number belongs to anyone, so a
   * number outside the app simply does not come back, and there is no fact here
   * that a later step would have to remember not to disclose. Bounded by the
   * per-call recipient cap and served by the `User.phoneNumber` unique index.
   *
   * The tier narrowing is applied by the caller against the same audience the
   * broadcast path resolves, so both paths agree on who an app may reach.
   */
  async getAppUserSubsByPhone(miniAppId: string, phones: string[]) {
    return await fromRepositoryPromise(async () => {
      if (phones.length === 0) return new Map<string, string>()

      const appUsers = await this.prismaService.miniAppUser.findMany({
        where: { miniAppId, user: { phoneNumber: { in: phones } } },
        select: { userId: true, user: { select: { phoneNumber: true } } },
      })

      return new Map(appUsers.map((appUser) => [appUser.user.phoneNumber, appUser.userId]))
    })
  }

  /**
   * Record one call against the key's daily budget, atomically.
   *
   * Sum-then-create alone can race: two concurrent sends both read "9 of 10"
   * and both insert. Locking the parent `NotificationApiKey` row serialises
   * claims for that key; the window is still a time range (`since`), so the
   * budget resets at the Bangkok day boundary with no job to run.
   *
   * The budget is denominated in **deliveries**, not calls: a claim spends
   * `units`, and the check is `used + units > dailyQuota` — so a call is refused
   * whole rather than delivered partway. That is what makes the cost of a send
   * knowable from the request alone, and it is why the 429 leaves nothing
   * delivered: a partial send the caller retries would double-notify.
   *
   * An `idempotencyKey` is looked up under the same lock, so a retry after a
   * timeout is answered from the row the first attempt wrote instead of being
   * delivered and charged twice.
   *
   * The caller meters *before* the actual send and must `releaseUsage` if the
   * send fails — otherwise an internal failure would consume budget.
   */
  async claimUsage(claim: UsageClaim) {
    const { notificationApiKeyId, dailyQuota, since, units, body, idempotencyKey } = claim

    return await fromRepositoryPromise(async () => {
      return await this.prismaService.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT 1 FROM "NotificationApiKey" WHERE id = ${notificationApiKeyId} FOR UPDATE
        `

        const spend = await tx.notificationApiKeyUsageLog.aggregate({
          where: {
            notificationApiKeyId,
            usedAt: { gte: since },
          },
          _sum: { units: true },
        })
        // No rows in the window sums to null, which is zero spent, not unknown.
        const used = spend._sum.units ?? 0

        // Read before the quota check rather than after, so a replay comes back
        // carrying the same `used` an original does and the caller's remaining
        // budget reads the same either way — the original charge is already in
        // the sum.
        if (idempotencyKey !== undefined) {
          const replayed = await tx.notificationApiKeyUsageLog.findUnique({
            where: {
              notificationApiKeyId_idempotencyKey: { notificationApiKeyId, idempotencyKey },
            },
            select: { id: true, body: true },
          })

          if (replayed) {
            return {
              status: 'replayed' as const,
              usageLogId: replayed.id,
              body: replayed.body,
              used,
            }
          }
        }

        if (dailyQuota !== null && used + units > dailyQuota) {
          return { status: 'quota_exceeded' as const, used }
        }

        const log = await tx.notificationApiKeyUsageLog.create({
          data: {
            body,
            units,
            idempotencyKey,
            notificationApiKey: { connect: { id: notificationApiKeyId } },
          },
        })

        return {
          status: 'ok' as const,
          usageLogId: log.id,
          // This claim is now spent, so report usage including it.
          used: used + units,
        }
      })
    })
  }

  /**
   * Undo a claim whose send never landed. Paired with `claimUsageUnderQuota` so
   * an internal failure does not cost the Builder part of their day's budget.
   */
  async releaseUsage(usageLogId: string) {
    return await fromRepositoryPromise(
      this.prismaService.notificationApiKeyUsageLog.delete({
        where: { id: usageLogId },
      })
    )
  }

  /** Set a key's daily quota — how the platform applies an approved LimitRequest. */
  async setDailyQuota(miniAppId: string, dailyQuota: number) {
    return await fromRepositoryPromise(async () => {
      const { count } = await this.prismaService.notificationApiKey.updateMany({
        where: { miniAppId, active: true },
        data: { dailyQuota },
      })

      return count
    })
  }

  /**
   * What the app's active key has spent since `since` — the same window and rows
   * `claimUsage` meters against, summed the same way.
   *
   * A `SUM` over `units` rather than a row count, because the budget is
   * denominated in deliveries: the Console tile and a 429 have to be reading the
   * same number, so the tile counts what the quota charges.
   *
   * The budget and the binding come back with it because a count alone cannot
   * be reported honestly: what it is measured against, and whether it is
   * measured at all, are properties of the key and the app it speaks for.
   *
   * `null` means there is no active key (retired / never provisioned), distinct
   * from zero sends.
   */
  async getUsageSince(miniAppId: string, since: Date) {
    return await fromRepositoryPromise(async () => {
      const key = await this.prismaService.notificationApiKey.findFirst({
        where: { miniAppId, active: true },
        select: { id: true, dailyQuota: true, miniApp: { select: { source: true } } },
      })

      if (!key) return null

      const spend = await this.prismaService.notificationApiKeyUsageLog.aggregate({
        where: {
          notificationApiKeyId: key.id,
          usedAt: { gte: since },
        },
        _sum: { units: true },
      })

      return {
        // No rows in the window sums to null, which is zero sent, not unknown.
        sent: spend._sum.units ?? 0,
        dailyQuota: key.dailyQuota,
        miniApp: key.miniApp,
      } satisfies ActiveKeyUsage
    })
  }
}
