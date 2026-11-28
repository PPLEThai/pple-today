import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { MiniAppTier } from '@pple-today/database/prisma'
import { err, ok } from 'neverthrow'

import type {
  CreatePlatformMiniAppData,
  PlatformMiniAppRepository,
  UpdatePlatformMiniAppData,
} from './mini-app-repository'

import type { MiniAppListCache } from '../../plugins/mini-app-cache'
import type { ZitadelService } from '../admin/zitadel/services'
import { toPlatformMiniAppDto } from '../mini-app/dto'
import { LINK_NAME_INVALID, linkNameTakenError, normalizeLinkName } from '../mini-app/link-name'

const NOT_FOUND = {
  RECORD_NOT_FOUND: {
    code: InternalErrorCode.MINI_APP_NOT_FOUND,
    message: 'Mini app with the given ID does not exist',
  },
} as const

/**
 * The reserved path the platform's edge membership door redirects to when it
 * runs its PKCE flow on the app's own host. Registered as a second redirect URI
 * on the app's OIDC client (alongside the app URL) so the door reuses the app's
 * existing client instead of minting a second one, and the resulting session
 * cookie is host-scoped by construction. Dispatch intercepts this path; it never
 * reaches the Builder's app. See pple-platform ADR-0013.
 */
export const DOOR_CALLBACK_PATH = '/.pple/auth/callback'

/**
 * The redirect URIs an app's OIDC client must allow: the app's own origin (the
 * mini-app SDK's default redirect) and the door callback on that same origin.
 *
 * Exported so the one-time backfill (`scripts/backfill-door-redirect-uris.ts`)
 * registers exactly the same pair on apps provisioned before the door existed.
 */
export const doorRedirectUris = (appUrl: string): string[] => [
  appUrl,
  new URL(DOOR_CALLBACK_PATH, appUrl).toString(),
]

/**
 * The lifecycle of a platform-provisioned Builder App, as driven by the
 * pple-platform provisioner over the `/platform` service API. today-v2 is the
 * single writer of Zitadel state, so every Zitadel effect flows through
 * `ZitadelService` here; the provisioner never talks to Zitadel directly.
 *
 * Kept free of Elysia/config imports so it can be unit-tested with a faked
 * `ZitadelService` at its service boundary; the plugin wiring lives in
 * `services.ts`.
 */
export class PlatformMiniAppService {
  constructor(
    private readonly platformMiniAppRepository: PlatformMiniAppRepository,
    private readonly zitadelService: ZitadelService,
    private readonly miniAppListCache: MiniAppListCache
  ) {}

  /**
   * Create a complete app registration in one call: the Zitadel OIDC app, the
   * `DRAFT`/`PLATFORM` mini-app row, and an app-bound notification key. Returns
   * the mini app plus its `clientId` and the notification key (shown once).
   *
   * The Zitadel app is created first so its `clientId` can be stored on the row;
   * if the row then fails (e.g. a slug clash), the error notes the orphaned
   * Zitadel app to reuse or clean up — the same contract as the admin path.
   */
  async createMiniApp(data: Omit<CreatePlatformMiniAppData, 'clientId' | 'zitadelAppId'>) {
    // Reject a Link Name the redirect host could not serve before creating the
    // Zitadel app, so a bad name does not leave an orphaned OIDC client.
    let linkName: string | undefined
    if (data.linkName !== undefined) {
      const normalized = normalizeLinkName(data.linkName)
      if (!normalized) return err(LINK_NAME_INVALID)
      linkName = normalized
    }

    // The mini-app SDK defaults its OAuth redirect URI to the app origin, and the
    // platform's edge door adds one more on the same host — the reserved door
    // callback — so both the app's own sign-in and the door share one client.
    const zitadelResult = await this.zitadelService.createOidcApp({
      name: data.name,
      redirectUris: doorRedirectUris(data.url),
    })
    if (zitadelResult.isErr()) return err(zitadelResult.error)
    const { appId, clientId } = zitadelResult.value

    const createResult = await this.platformMiniAppRepository.createMiniApp({
      ...data,
      ...(linkName !== undefined ? { linkName } : {}),
      clientId,
      zitadelAppId: appId,
    })
    if (createResult.isErr()) {
      const orphan = ` Note: a Zitadel app was already created with clientId "${clientId}" — reuse it or clean it up in Zitadel.`
      const taken = linkNameTakenError(createResult.error)
      if (taken) return err({ ...taken, message: `${taken.message}.${orphan}` })

      return mapRepositoryError(createResult.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.MINI_APP_SLUG_ALREADY_EXISTS,
          message: `Mini app with the given slug already exists.${orphan}`,
        },
        INTERNAL_SERVER_ERROR: `Failed to create mini app.${orphan}`,
      })
    }

    // Invalidate so the owner sees their new Draft in their list immediately.
    this.miniAppListCache.invalidate()

    return ok({
      ...toPlatformMiniAppDto(createResult.value.miniApp),
      notificationKey: createResult.value.notificationApiKey,
    })
  }

  /**
   * Update presentation fields (name/icon/url). The Zitadel app mirrors two of
   * them: its name follows the app's name, and its redirect URIs follow the
   * URL. Either change is pushed to Zitadel first — if that fails the row is
   * left untouched, so the OIDC app and the stored row never silently diverge.
   */
  async updateMiniApp(id: string, data: UpdatePlatformMiniAppData) {
    let next = data
    if (typeof data.linkName === 'string') {
      const linkName = normalizeLinkName(data.linkName)
      if (!linkName) return err(LINK_NAME_INVALID)
      next = { ...data, linkName }
    }

    const existingResult = await this.platformMiniAppRepository.getMiniAppById(id)
    if (existingResult.isErr()) return mapRepositoryError(existingResult.error, NOT_FOUND)
    const existing = existingResult.value

    const renamed = next.name !== undefined && next.name !== existing.name
    const moved = next.url !== undefined && next.url !== existing.clientUrl
    if ((renamed || moved) && existing.zitadelAppId) {
      const zitadelResult = await this.zitadelService.updateOidcApp(existing.zitadelAppId, {
        ...(renamed ? { name: next.name } : {}),
        ...(moved ? { redirectUris: doorRedirectUris(next.url!) } : {}),
      })
      if (zitadelResult.isErr()) return err(zitadelResult.error)
    }

    const updateResult = await this.platformMiniAppRepository.updateMiniApp(id, next)
    if (updateResult.isErr()) {
      const taken = linkNameTakenError(updateResult.error)
      if (taken) return err(taken)
      return mapRepositoryError(updateResult.error, NOT_FOUND)
    }

    this.miniAppListCache.invalidate()

    return ok(toPlatformMiniAppDto(updateResult.value))
  }

  /**
   * Set the effective tier. The platform enforces *who may* change tier
   * (Draft→Beta self-service, Beta→Live approved); today-v2 records the
   * effective value and re-lists accordingly.
   *
   * The first promotion to Live stamps `publishedAt`, which is what makes the
   * app "new" in PPLE Today. A later demotion and re-promotion keeps the
   * original stamp, so pulling an app back briefly does not re-announce it.
   */
  async setTier(id: string, tier: MiniAppTier) {
    // Confirm the target is a platform app (getMiniAppById is scoped to
    // source = PLATFORM), so the platform API can't retier a central-team app.
    const existingResult = await this.platformMiniAppRepository.getMiniAppById(id)
    if (existingResult.isErr()) return mapRepositoryError(existingResult.error, NOT_FOUND)

    const publishedAt =
      tier === MiniAppTier.LIVE && existingResult.value.publishedAt === null
        ? new Date()
        : undefined

    const result = await this.platformMiniAppRepository.setTier(id, tier, publishedAt)
    if (result.isErr()) return mapRepositoryError(result.error, NOT_FOUND)

    this.miniAppListCache.invalidate()

    return ok(toPlatformMiniAppDto(result.value))
  }

  /** Replace the Live-tier visibility roles (empty = visible to everyone). */
  async setRoles(id: string, roles: string[]) {
    // Scope to platform apps first (see setTier).
    const existingResult = await this.platformMiniAppRepository.getMiniAppById(id)
    if (existingResult.isErr()) return mapRepositoryError(existingResult.error, NOT_FOUND)

    const result = await this.platformMiniAppRepository.setRoles(id, roles)
    if (result.isErr()) return mapRepositoryError(result.error, NOT_FOUND)

    this.miniAppListCache.invalidate()

    return ok(toPlatformMiniAppDto(result.value))
  }

  /**
   * Set the Live `unlisted` visibility mode. Unlisted lists the app to no one
   * while leaving it reachable by its link — orthogonal to the visibility roles,
   * so this leaves them untouched. Only meaningful for a Live app.
   */
  async setUnlisted(id: string, unlisted: boolean) {
    // Scope to platform apps first (see setTier).
    const existingResult = await this.platformMiniAppRepository.getMiniAppById(id)
    if (existingResult.isErr()) return mapRepositoryError(existingResult.error, NOT_FOUND)

    const result = await this.platformMiniAppRepository.setUnlisted(id, unlisted)
    if (result.isErr()) return mapRepositoryError(result.error, NOT_FOUND)

    this.miniAppListCache.invalidate()

    return ok(toPlatformMiniAppDto(result.value))
  }

  /**
   * Replace the app's Collaborators (PPLE ID `sub`s). The platform database owns
   * Collaborators authoritatively; this syncs today-v2's copy so a Draft or Beta
   * app is *listed* in PPLE Today for its Collaborators, not the Owner alone.
   */
  async setCollaborators(id: string, collaboratorSubs: string[]) {
    // Scope to platform apps first (see setTier).
    const existingResult = await this.platformMiniAppRepository.getMiniAppById(id)
    if (existingResult.isErr()) return mapRepositoryError(existingResult.error, NOT_FOUND)

    const result = await this.platformMiniAppRepository.setCollaborators(id, collaboratorSubs)
    if (result.isErr()) return mapRepositoryError(result.error, NOT_FOUND)

    this.miniAppListCache.invalidate()

    return ok({ collaboratorSubs: result.value.collaboratorSubs })
  }

  /**
   * Retire the app: delete its Zitadel OIDC app (so it can authenticate nobody),
   * soft-delete the row, and deactivate its notification key. An already-deleted
   * Zitadel app is tolerated so retire is idempotent.
   */
  async retire(id: string) {
    const existingResult = await this.platformMiniAppRepository.getMiniAppById(id)
    if (existingResult.isErr()) return mapRepositoryError(existingResult.error, NOT_FOUND)
    const existing = existingResult.value

    if (existing.zitadelAppId) {
      const zitadelResult = await this.zitadelService.deleteApp(existing.zitadelAppId)
      if (
        zitadelResult.isErr() &&
        zitadelResult.error.code !== InternalErrorCode.ZITADEL_APP_NOT_FOUND
      ) {
        return err(zitadelResult.error)
      }
    }

    const retireResult = await this.platformMiniAppRepository.retire(id)
    if (retireResult.isErr()) return mapRepositoryError(retireResult.error, NOT_FOUND)

    this.miniAppListCache.invalidate()

    return ok({ message: 'Mini app retired successfully' })
  }

  /**
   * Release one held Link Name. Canonical names can also be cleared with
   * `linkName: null` on update, which leaves replaced names in place; this
   * removes exactly the named row, whether it is canonical or replaced.
   */
  async releaseLinkName(id: string, name: string) {
    const result = await this.platformMiniAppRepository.releaseLinkName(id, name)
    if (result.isErr()) return mapRepositoryError(result.error, NOT_FOUND)

    this.miniAppListCache.invalidate()

    return ok(result.value)
  }

  /** ADMIN-source mini-apps the platform may connect to a Bridge. */
  async listAdminMiniApps() {
    const result = await this.platformMiniAppRepository.listAdminMiniApps()
    if (result.isErr()) return mapRepositoryError(result.error, NOT_FOUND)
    return ok(result.value)
  }

  /**
   * Connect an ADMIN mini-app to a platform Bridge. Responses then go to the
   * platform relay keyed by `bridgeSlug`, and the returned PLATFORM-source
   * notification key (shown once) is the one the platform sends with.
   * A PLATFORM-source app, an already-connected app, and a Bridge slug another
   * app holds are each refused with their own 409.
   */
  async connectBridge(id: string, bridgeSlug: string) {
    const result = await this.platformMiniAppRepository.connectBridge(id, bridgeSlug)
    if (result.isErr()) {
      return mapRepositoryError(result.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.MINI_APP_BRIDGE_SLUG_TAKEN,
          message: 'Another mini app is already connected to this Bridge',
        },
        ...NOT_FOUND,
      })
    }

    const value = result.value
    switch (value.refusal) {
      case 'NOT_FOUND':
        return err(NOT_FOUND.RECORD_NOT_FOUND)
      case 'NOT_ADMIN_SOURCE':
        return err({
          code: InternalErrorCode.MINI_APP_NOT_ADMIN_SOURCE,
          message: 'Only an ADMIN-source mini app can be connected to a Bridge',
        })
      case 'ALREADY_CONNECTED':
        return err({
          code: InternalErrorCode.MINI_APP_ALREADY_CONNECTED,
          message: 'This mini app is already connected to a Bridge',
        })
    }

    return ok({
      miniAppId: value.miniAppId,
      bridgeSlug: value.bridgeSlug,
      notificationKey: value.notificationApiKey,
    })
  }

  /**
   * Disconnect an ADMIN mini-app from its Bridge: clears the slug and
   * deactivates the PLATFORM-source key. Idempotent — an ADMIN app that is not
   * connected answers success (`disconnected: false`); an unknown, retired or
   * PLATFORM-source app is not-found.
   */
  async disconnectBridge(id: string) {
    const result = await this.platformMiniAppRepository.disconnectBridge(id)
    if (result.isErr()) return mapRepositoryError(result.error, NOT_FOUND)
    if (!result.value) return err(NOT_FOUND.RECORD_NOT_FOUND)

    return ok({ miniAppId: id, disconnected: result.value.wasConnected })
  }
}
