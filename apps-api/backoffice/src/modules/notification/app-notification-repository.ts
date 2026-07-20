import type { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import type { Prisma } from '@pple-today/database/prisma'
import { MiniAppInviteStatus } from '@pple-today/database/prisma'

import type { AppNotificationSendContext } from './app-audience'

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
   * Claim one send against the key's daily quota, atomically.
   *
   * Count-then-create alone can race: two concurrent sends both read "9 of 10"
   * and both insert. Locking the parent `NotificationApiKey` row serialises
   * claims for that key; the window is still a time range (`since`), so the
   * budget resets at the Bangkok day boundary with no job to run.
   *
   * The caller meters *before* the actual send and must `releaseUsage` if the
   * send fails — otherwise an internal failure would consume budget.
   */
  async claimUsageUnderQuota(
    notificationApiKeyId: string,
    dailyQuota: number,
    since: Date,
    body: Prisma.InputJsonValue
  ) {
    return await fromRepositoryPromise(async () => {
      return await this.prismaService.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT 1 FROM "NotificationApiKey" WHERE id = ${notificationApiKeyId} FOR UPDATE
        `

        const used = await tx.notificationApiKeyUsageLog.count({
          where: {
            notificationApiKeyId,
            usedAt: { gte: since },
          },
        })

        if (used >= dailyQuota) {
          return { status: 'quota_exceeded' as const, used }
        }

        const log = await tx.notificationApiKeyUsageLog.create({
          data: {
            body,
            notificationApiKey: { connect: { id: notificationApiKeyId } },
          },
        })

        return {
          status: 'ok' as const,
          usageLogId: log.id,
          // This claim is now spent, so report usage including it.
          used: used + 1,
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
   * How many sends the app's active key has logged since `since` — the same
   * window and rows `claimUsageUnderQuota` meters against. `null` means there
   * is no active key (retired / never provisioned), distinct from zero sends.
   */
  async countUsageSince(miniAppId: string, since: Date) {
    return await fromRepositoryPromise(async () => {
      const key = await this.prismaService.notificationApiKey.findFirst({
        where: { miniAppId, active: true },
        select: { id: true },
      })

      if (!key) return null

      return await this.prismaService.notificationApiKeyUsageLog.count({
        where: {
          notificationApiKeyId: key.id,
          usedAt: { gte: since },
        },
      })
    })
  }
}
