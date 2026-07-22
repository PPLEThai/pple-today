import type { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { MiniAppInviteStatus } from '@pple-today/database/prisma'

const MINI_APP_SELECTION = { id: true, name: true, slug: true, ownerSub: true } as const

/**
 * Persistence for `MiniAppInvite` — the Beta testers a Builder has invited and
 * whether they accepted.
 *
 * The class is kept free of Elysia/config imports so it can be unit-tested
 * without booting the app's config graph; the plugin wiring lives in
 * `repository.ts`.
 */
export class MiniAppInviteRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Display names for a set of PPLE ID subs (which are `User.id`), used to name
   * the Builder who sent an invitation. Missing ids simply drop out — the name
   * is a nicety on the invite, never a key, so an owner without a matching
   * account must not break the listing or the notification.
   */
  async getUserNamesByIds(ids: string[]) {
    return await fromRepositoryPromise(
      this.prismaService.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true },
      })
    )
  }

  async getMiniApp(miniAppId: string) {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.findUnique({
        where: { id: miniAppId },
        select: MINI_APP_SELECTION,
      })
    )
  }

  /** Every invite on an app — the Builder's tester list, declined ones included. */
  async listByMiniApp(miniAppId: string) {
    return await fromRepositoryPromise(
      this.prismaService.miniAppInvite.findMany({
        where: { miniAppId },
        orderBy: { createdAt: 'asc' },
      })
    )
  }

  /**
   * Invites currently holding one of the app's tester seats. A declined
   * invitation is kept for the record but frees its seat — the tester is not
   * testing the app, so it should not cost the Builder a slot.
   */
  async countHoldingSeat(miniAppId: string) {
    return await fromRepositoryPromise(
      this.prismaService.miniAppInvite.count({
        where: { miniAppId, status: { not: MiniAppInviteStatus.DECLINED } },
      })
    )
  }

  async findOne(miniAppId: string, phoneNumber: string) {
    return await fromRepositoryPromise(
      this.prismaService.miniAppInvite.findUnique({
        where: { miniAppId_phoneNumber: { miniAppId, phoneNumber } },
      })
    )
  }

  /**
   * Claim a tester seat under the cap, atomically.
   *
   * Create the invite, or re-open a declined one (upsert, not create, so the
   * table key of app + number is reused and the previous answer cleared).
   *
   * `count` then `upsert` alone can race: two concurrent creates both read
   * "19 held" and both insert. Locking the parent `MiniApp` row serialises
   * seat claims for that app; the limit stays a caller-supplied constant so a
   * Platform Admin can raise it later without a migration.
   */
  async upsertPendingUnderCap(miniAppId: string, phoneNumber: string, limit: number) {
    return await fromRepositoryPromise(async () => {
      return await this.prismaService.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT 1 FROM "MiniApp" WHERE id = ${miniAppId} FOR UPDATE
        `

        const held = await tx.miniAppInvite.count({
          where: { miniAppId, status: { not: MiniAppInviteStatus.DECLINED } },
        })

        if (held >= limit) {
          return { status: 'limit_exceeded' as const }
        }

        const invite = await tx.miniAppInvite.upsert({
          where: { miniAppId_phoneNumber: { miniAppId, phoneNumber } },
          create: { miniAppId, phoneNumber },
          update: {
            status: MiniAppInviteStatus.PENDING,
            userId: null,
            respondedAt: null,
          },
        })

        return { status: 'ok' as const, invite }
      })
    })
  }

  /** Returns whether a row was actually removed, so the caller can 404 honestly. */
  async remove(miniAppId: string, phoneNumber: string) {
    return await fromRepositoryPromise(async () => {
      const { count } = await this.prismaService.miniAppInvite.deleteMany({
        where: { miniAppId, phoneNumber },
      })

      return count > 0
    })
  }

  /** The invitee's inbox: invitations addressed to their number, awaiting an answer. */
  async listPendingForPhoneNumber(phoneNumber: string) {
    return await fromRepositoryPromise(
      this.prismaService.miniAppInvite.findMany({
        where: { phoneNumber, status: MiniAppInviteStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        include: { miniApp: { select: MINI_APP_SELECTION } },
      })
    )
  }

  /**
   * The mini apps this user has accepted an invite to. Matched on `userId`
   * alone — the phone number is a delivery address, not the key to access, so a
   * tester who changes their number keeps what they accepted.
   */
  async listAcceptedMiniAppIds(userId: string) {
    return await fromRepositoryPromise(async () => {
      const invites = await this.prismaService.miniAppInvite.findMany({
        where: { userId, status: MiniAppInviteStatus.ACCEPTED },
        select: { miniAppId: true },
      })

      return new Set(invites.map((invite) => invite.miniAppId))
    })
  }

  async recordResponse(
    miniAppId: string,
    phoneNumber: string,
    response: { status: MiniAppInviteStatus; userId: string }
  ) {
    return await fromRepositoryPromise(
      this.prismaService.miniAppInvite.update({
        where: { miniAppId_phoneNumber: { miniAppId, phoneNumber } },
        data: { ...response, respondedAt: new Date() },
      })
    )
  }
}
