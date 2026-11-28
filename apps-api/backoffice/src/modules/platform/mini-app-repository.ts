import { InternalErrorCode } from '@pple-today/api-common/dtos'
import type { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import {
  MiniAppSource,
  MiniAppTier,
  NotificationApiKeySource,
  NotificationCallbackStatus,
  Prisma,
} from '@pple-today/database/prisma'
import { err, ok } from 'neverthrow'

import {
  generateNotificationApiKey,
  hashNotificationApiKey,
} from '../../utils/notification-api-key'
import { miniAppResponseInclude } from '../mini-app/dto'
import {
  LINK_NAME_ALREADY_HELD,
  LINK_NAME_CLASHES_WITH_SLUG,
  LINK_NAME_INVALID,
  normalizeLinkName,
  SLUG_CLASHES_WITH_LINK_NAME,
} from '../mini-app/link-name'
import { normalizeTagline } from '../mini-app/tagline'

export interface CreatePlatformMiniAppData {
  name: string
  slug: string
  url: string
  ownerSub: string
  clientId: string
  zitadelAppId: string
  iconUrl?: string
  tagline?: string
  /**
   * Daily notification quota for the app's key. The platform owns Resource
   * Limits, so it passes the limit the app was provisioned with; omitted leaves
   * the column default.
   */
  dailyQuota?: number
  /** Canonical Link Name. Omitted leaves the app with none. Stored lowercase. */
  linkName?: string
}

export interface UpdatePlatformMiniAppData {
  name?: string
  url?: string
  iconUrl?: string
  /** `null` clears it; `undefined` leaves it untouched. */
  tagline?: string | null
  /**
   * Canonical Link Name. `undefined` leaves held names untouched. `null`
   * releases the canonical name and keeps replaced ones. A string demotes the
   * previous canonical name to replaced — it stays held and keeps redirecting.
   */
  linkName?: string | null
}

type LinkNameClash = {
  code: typeof InternalErrorCode.MINI_APP_LINK_NAME_TAKEN
  message: string
}

/**
 * A Link Name may not equal any slug, including this app's, and may not equal
 * a name another app holds. A name this app already holds is not a clash: that
 * is how a replaced name is promoted back to canonical.
 */
async function findLinkNameClash(
  tx: Prisma.TransactionClient,
  name: string,
  owningMiniAppId?: string
): Promise<LinkNameClash | null> {
  const slugHit = await tx.miniApp.findFirst({
    where: { slug: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  })
  if (slugHit) return LINK_NAME_CLASHES_WITH_SLUG

  const held = await tx.miniAppLinkName.findUnique({
    where: { name },
    select: { miniAppId: true },
  })
  if (held && held.miniAppId !== owningMiniAppId) return LINK_NAME_ALREADY_HELD

  return null
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
    let linkName: string | undefined
    if (data.linkName !== undefined) {
      const normalized = normalizeLinkName(data.linkName)
      if (!normalized) return err(LINK_NAME_INVALID)
      linkName = normalized
    }

    // Set inside the transaction, read after it commits. A clash returns before
    // any write, so the assignment is visible and the transaction has inserted
    // nothing. The migration trigger still rejects a race.
    let clash: LinkNameClash | null = null
    const created = await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        // The slug joins the same namespace as held names.
        const slugHeld = await tx.miniAppLinkName.findUnique({
          where: { name: data.slug.trim().toLowerCase() },
          select: { name: true },
        })
        if (slugHeld) {
          clash = SLUG_CLASHES_WITH_LINK_NAME
          return null
        }

        if (linkName) {
          // The new row is not visible to the slug lookup yet, so an app cannot
          // be given its own slug as a Link Name without this comparison.
          if (linkName === data.slug.trim().toLowerCase()) {
            clash = LINK_NAME_CLASHES_WITH_SLUG
            return null
          }
          const nameClash = await findLinkNameClash(tx, linkName)
          if (nameClash) {
            clash = nameClash
            return null
          }
        }

        const inserted = await tx.miniApp.create({
          data: {
            name: data.name,
            slug: data.slug,
            clientUrl: data.url,
            clientId: data.clientId,
            zitadelAppId: data.zitadelAppId,
            icon: data.iconUrl,
            tagline: normalizeTagline(data.tagline),
            requiresAuth: true,
            tier: MiniAppTier.DRAFT,
            source: MiniAppSource.PLATFORM,
            ownerSub: data.ownerSub,
          },
        })

        if (linkName) {
          await tx.miniAppLinkName.create({
            data: {
              name: linkName,
              miniAppId: inserted.id,
              canonicalForId: inserted.id,
            },
          })
        }

        // Stamped PLATFORM explicitly rather than inherited from the app: this
        // key goes to an outside Builder, so it is the audience-scoped, metered
        // kind. The column defaults to ADMIN, which is what an admin-portal
        // create is — including one bound to *this* app.
        await tx.notificationApiKey.create({
          data: {
            name: data.name,
            apiKey: hashNotificationApiKey(notificationApiKey),
            miniAppId: inserted.id,
            source: NotificationApiKeySource.PLATFORM,
            dailyQuota: data.dailyQuota,
          },
        })

        // Re-read so the canonical Link Name, written just above, is on the row.
        const miniApp = await tx.miniApp.findUniqueOrThrow({
          where: { id: inserted.id },
          include: miniAppResponseInclude,
        })

        return miniApp
      })
    )

    if (created.isErr()) return err(created.error)
    if (clash) return err(clash)
    if (!created.value) {
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to create mini app',
      })
    }

    return ok({ miniApp: created.value, notificationApiKey })
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
    let linkName: string | null | undefined
    if (data.linkName === undefined) linkName = undefined
    else if (data.linkName === null) linkName = null
    else {
      const normalized = normalizeLinkName(data.linkName)
      if (!normalized) return err(LINK_NAME_INVALID)
      linkName = normalized
    }

    let clash: LinkNameClash | null = null
    const updated = await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        if (typeof linkName === 'string') {
          const nameClash = await findLinkNameClash(tx, linkName, id)
          if (nameClash) {
            clash = nameClash
            return null
          }

          // Demote first. `canonicalForId` is unique, so the new canonical row
          // cannot be written while the previous one still holds it. A replaced
          // name of this same app is promoted in place rather than inserted.
          await tx.miniAppLinkName.updateMany({
            where: { miniAppId: id, canonicalForId: { not: null }, NOT: { name: linkName } },
            data: { canonicalForId: null },
          })
          const held = await tx.miniAppLinkName.findUnique({
            where: { name: linkName },
            select: { miniAppId: true },
          })
          if (held) {
            await tx.miniAppLinkName.update({
              where: { name: linkName },
              data: { canonicalForId: id },
            })
          } else {
            await tx.miniAppLinkName.create({
              data: { name: linkName, miniAppId: id, canonicalForId: id },
            })
          }
        } else if (linkName === null) {
          // Releasing the canonical name does not release replaced ones. Those
          // stay held, and keep redirecting, until the platform deletes them.
          await tx.miniAppLinkName.deleteMany({
            where: { miniAppId: id, canonicalForId: { not: null } },
          })
        }

        const miniApp = await tx.miniApp.update({
          where: { id },
          data: {
            name: data.name,
            clientUrl: data.url,
            icon: data.iconUrl,
            tagline: normalizeTagline(data.tagline),
          },
          include: miniAppResponseInclude,
        })

        return miniApp
      })
    )

    if (updated.isErr()) return err(updated.error)
    if (clash) return err(clash)
    if (!updated.value) {
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to update mini app',
      })
    }
    return ok(updated.value)
  }

  /**
   * Release one held name, canonical or replaced. The name stops redirecting.
   * Releasing the canonical name does not promote a replaced one.
   */
  async releaseLinkName(id: string, name: string) {
    const normalized = normalizeLinkName(name)
    if (!normalized) {
      return err({
        code: InternalErrorCode.MINI_APP_NOT_FOUND,
        message: 'Held link name does not exist on this mini app',
      })
    }

    const existing = await this.getMiniAppById(id)
    if (existing.isErr()) return err(existing.error)

    const held = await fromRepositoryPromise(
      this.prismaService.miniAppLinkName.findUnique({
        where: { name: normalized },
        select: { miniAppId: true },
      })
    )
    if (held.isErr()) return err(held.error)
    if (!held.value || held.value.miniAppId !== id) {
      return err({
        code: InternalErrorCode.MINI_APP_NOT_FOUND,
        message: 'Held link name does not exist on this mini app',
      })
    }

    const deleted = await fromRepositoryPromise(
      this.prismaService.miniAppLinkName.delete({ where: { name: normalized } })
    )
    if (deleted.isErr()) return err(deleted.error)

    return ok({ message: 'Link name released' })
  }

  /**
   * Set the effective tier. The platform decides *who may*; today-v2 records it.
   * `publishedAt` is stamped by the caller on an app's first promotion to Live.
   */
  async setTier(id: string, tier: MiniAppTier, publishedAt?: Date) {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.update({
        where: { id },
        data: { tier, publishedAt },
        include: miniAppResponseInclude,
      })
    )
  }

  /** Set the Live `unlisted` visibility mode. Leaves the visibility roles alone. */
  async setUnlisted(id: string, unlisted: boolean) {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.update({
        where: { id },
        data: { unlisted },
        include: miniAppResponseInclude,
      })
    )
  }

  /**
   * Replace the app's Collaborators (PPLE ID `sub`s). A whole-list replace, like
   * `setRoles`, so the platform stays the single source of truth: today-v2 mirrors
   * exactly what it is told and never accumulates stale entries.
   */
  async setCollaborators(id: string, collaboratorSubs: string[]) {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.update({
        where: { id },
        data: { collaboratorSubs },
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
          include: miniAppResponseInclude,
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
        // Retire keeps the row, so the slug cascade never runs. Names are
        // deleted on purpose: a retired app's Today Link under a Link Name
        // returns 404. The platform keeps its own record of the hold.
        await tx.miniAppLinkName.deleteMany({ where: { miniAppId: id } })
        await tx.notificationApiKey.updateMany({
          where: { miniAppId: id, active: true },
          data: { active: false },
        })
        // Answers still waiting for delivery have nowhere to go: the app is gone.
        await tx.notificationResponse.updateMany({
          where: { miniAppId: id, deliveryStatus: NotificationCallbackStatus.PENDING },
          data: {
            deliveryStatus: NotificationCallbackStatus.FAILED,
            lastError: 'app retired',
            lastAttemptAt: new Date(),
            nextAttemptAt: null,
          },
        })
        return miniApp
      })
    )
  }

  /**
   * The non-retired ADMIN-source mini-apps, for the platform Console's picker
   * of which one to connect to a Bridge. `platformBridgeSlug` says which are
   * already connected.
   */
  async listAdminMiniApps() {
    return await fromRepositoryPromise(
      this.prismaService.miniApp.findMany({
        where: { source: MiniAppSource.ADMIN, retiredAt: null },
        select: { id: true, slug: true, name: true, icon: true, platformBridgeSlug: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      })
    )
  }

  /**
   * Connect an ADMIN-source mini-app to a platform Bridge, in one transaction:
   * stamp `platformBridgeSlug` and mint the app's PLATFORM-source notification
   * key (audience-bound, metered). Returns the plaintext key — the only time it
   * is available in the clear — or a domain refusal.
   *
   * The stamp is a conditional `updateMany` (`platformBridgeSlug: null`), so two
   * racing connects cannot both win. A Bridge slug already held by another app
   * surfaces as a unique-constraint error for the service to map.
   */
  async connectBridge(id: string, bridgeSlug: string) {
    const notificationApiKey = generateNotificationApiKey()

    const connected = await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const app = await tx.miniApp.findUnique({
          where: { id },
          select: { name: true, source: true, retiredAt: true, platformBridgeSlug: true },
        })
        if (!app || app.retiredAt !== null) return { refusal: 'NOT_FOUND' as const }
        if (app.source !== MiniAppSource.ADMIN) return { refusal: 'NOT_ADMIN_SOURCE' as const }
        if (app.platformBridgeSlug !== null) return { refusal: 'ALREADY_CONNECTED' as const }

        const { count } = await tx.miniApp.updateMany({
          where: { id, platformBridgeSlug: null },
          data: { platformBridgeSlug: bridgeSlug },
        })
        if (count === 0) return { refusal: 'ALREADY_CONNECTED' as const }

        // PLATFORM-sourced on an ADMIN app: audience-bound and metered, held by
        // the platform (the admin portal refuses to manage PLATFORM keys).
        await tx.notificationApiKey.create({
          data: {
            name: app.name,
            apiKey: hashNotificationApiKey(notificationApiKey),
            miniAppId: id,
            source: NotificationApiKeySource.PLATFORM,
          },
        })

        return { refusal: null }
      })
    )

    if (connected.isErr()) return err(connected.error)
    if (connected.value.refusal) return ok({ refusal: connected.value.refusal })
    return ok({ refusal: null, miniAppId: id, bridgeSlug, notificationApiKey })
  }

  /**
   * Disconnect, in one transaction: clear `platformBridgeSlug` and deactivate the
   * app's active PLATFORM-source keys. Nothing else is touched — its ADMIN keys,
   * App Users, settings and stored callback URL/secret stay, so responses fall
   * back to the app's own callback again. `wasConnected` is false for an app
   * that had no Bridge (the key sweep still runs; it is a no-op then).
   */
  async disconnectBridge(id: string) {
    const result = await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const app = await tx.miniApp.findUnique({
          where: { id },
          select: { source: true, retiredAt: true, platformBridgeSlug: true },
        })
        if (!app || app.retiredAt !== null || app.source !== MiniAppSource.ADMIN) return null

        await tx.miniApp.update({ where: { id }, data: { platformBridgeSlug: null } })
        await tx.notificationApiKey.updateMany({
          where: { miniAppId: id, source: NotificationApiKeySource.PLATFORM, active: true },
          data: { active: false },
        })
        return { wasConnected: app.platformBridgeSlug !== null }
      })
    )

    if (result.isErr()) return err(result.error)
    if (!result.value) return ok(null)
    return ok(result.value)
  }
}
