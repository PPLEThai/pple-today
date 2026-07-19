import type { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { MiniAppSource, MiniAppTier } from '@pple-today/database/prisma'

import {
  generateNotificationApiKey,
  hashNotificationApiKey,
} from '../../utils/notification-api-key'

export interface CreatePlatformMiniAppData {
  name: string
  slug: string
  url: string
  ownerSub: string
  clientId: string
  zitadelAppId: string
  iconUrl?: string
  /**
   * Daily notification quota for the app's key. The platform owns Resource
   * Limits, so it passes the limit the app was provisioned with; omitted leaves
   * the column default.
   */
  dailyQuota?: number
}

export interface UpdatePlatformMiniAppData {
  name?: string
  url?: string
  iconUrl?: string
}

/**
 * Persistence for platform-provisioned Builder Apps. Kept free of Elysia/config
 * imports so it can be unit-tested without booting the app's config graph; the
 * plugin wiring lives in `services.ts`.
 *
 * A platform app is always created as `DRAFT`/`PLATFORM` with an `ownerSub`, so
 * the tier-aware listing shows it to its Builder immediately and to nobody else.
 */
export class PlatformMiniAppRepository {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Create the mini-app row and its app-bound notification key in one
   * transaction, so a Builder App never exists without its key (or vice versa).
   * The Zitadel OIDC app is created earlier in the service layer; its `clientId`
   * and internal `zitadelAppId` are passed in here.
   *
   * Returns the created row (with roles) and the plaintext notification key —
   * the only time the key is ever available in the clear.
   */
  async createMiniApp(data: CreatePlatformMiniAppData) {
    const notificationApiKey = generateNotificationApiKey()

    return await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const miniApp = await tx.miniApp.create({
          data: {
            name: data.name,
            slug: data.slug,
            clientUrl: data.url,
            clientId: data.clientId,
            zitadelAppId: data.zitadelAppId,
            icon: data.iconUrl,
            requiresAuth: true,
            tier: MiniAppTier.DRAFT,
            source: MiniAppSource.PLATFORM,
            ownerSub: data.ownerSub,
          },
          include: { miniAppRoles: true },
        })

        await tx.notificationApiKey.create({
          data: {
            name: data.name,
            apiKey: hashNotificationApiKey(notificationApiKey),
            miniAppId: miniApp.id,
            dailyQuota: data.dailyQuota,
          },
        })

        return { miniApp, notificationApiKey }
      })
    )
  }

  /**
   * Fetch a single platform-managed mini app (with its roles), or a not-found
   * error. Scoped to `source = PLATFORM` so the platform API can only ever read
   * — and therefore only ever mutate or retire — the apps it provisioned;
   * central-team (`ADMIN`) rows are invisible here and report as not-found.
   */
  async getMiniAppById(id: string) {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.findFirstOrThrow({
        where: { id, source: MiniAppSource.PLATFORM },
        include: { miniAppRoles: true },
      })
    )
  }

  /** Update mutable presentation fields. Undefined fields are left untouched. */
  async updateMiniApp(id: string, data: UpdatePlatformMiniAppData) {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.update({
        where: { id },
        data: {
          name: data.name,
          clientUrl: data.url,
          icon: data.iconUrl,
        },
        include: { miniAppRoles: true },
      })
    )
  }

  /** Set the effective tier. The platform decides *who may*; today-v2 records it. */
  async setTier(id: string, tier: MiniAppTier) {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.update({
        where: { id },
        data: { tier },
        include: { miniAppRoles: true },
      })
    )
  }

  /**
   * Replace the Live-tier visibility roles. Reuses `MiniAppRole`, the same table
   * the LIVE listing rule reads, so an empty array means "visible to everyone".
   */
  async setRoles(id: string, roles: string[]) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        // Confirm the app exists first so setting roles on a missing id is a
        // RECORD_NOT_FOUND, not a silent no-op on the child rows.
        await tx.miniApp.findUniqueOrThrow({ where: { id }, select: { id: true } })
        await tx.miniAppRole.deleteMany({ where: { miniAppId: id } })
        if (roles.length > 0) {
          await tx.miniAppRole.createMany({
            data: roles.map((role) => ({ role, miniAppId: id })),
          })
        }
        return tx.miniApp.findUniqueOrThrow({
          where: { id },
          include: { miniAppRoles: true },
        })
      })
    )
  }

  /**
   * Retire (soft-delete) the app: stamp `retiredAt` and deactivate its
   * notification key(s). The Zitadel app is deleted earlier in the service
   * layer. The row and its App User registry are kept for audit; the listing
   * hides retired apps.
   */
  async retire(id: string) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const miniApp = await tx.miniApp.update({
          where: { id },
          data: { retiredAt: new Date() },
          include: { miniAppRoles: true },
        })
        await tx.notificationApiKey.updateMany({
          where: { miniAppId: id, active: true },
          data: { active: false },
        })
        return miniApp
      })
    )
  }
}
