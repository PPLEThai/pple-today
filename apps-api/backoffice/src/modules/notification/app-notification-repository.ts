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
   * Count this key's sends inside the current quota window. The window is a
   * time range rather than a stored counter, so the budget resets at the day
   * boundary on its own — there is no job to run and nothing to reset.
   */
  async countUsageSince(notificationApiKeyId: string, since: Date) {
    return await fromRepositoryPromise(
      this.prismaService.notificationApiKeyUsageLog.count({
        where: {
          notificationApiKeyId,
          usedAt: { gte: since },
        },
      })
    )
  }

  /**
   * Meter one audience-bound send against the key.
   *
   * The logged body records the *content and the audience descriptor*, never the
   * resolved recipients. The recipient list is derived from the registry and can
   * be re-derived at any time; copying user ids into a log row would spread the
   * audience across another table for no gain, in a feature whose entire point
   * is that an app never handles who its users are.
   */
  async recordUsage(notificationApiKeyId: string, body: Prisma.InputJsonValue) {
    return await fromRepositoryPromise(
      this.prismaService.notificationApiKeyUsageLog.create({
        data: {
          body,
          notificationApiKey: { connect: { id: notificationApiKeyId } },
        },
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
}
