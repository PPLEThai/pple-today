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
import { toMiniAppDto } from '../mini-app/dto'

const NOT_FOUND = {
  RECORD_NOT_FOUND: {
    code: InternalErrorCode.MINI_APP_NOT_FOUND,
    message: 'Mini app with the given ID does not exist',
  },
} as const

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
    // The mini-app SDK defaults its OAuth redirect URI to the app origin, so the
    // provisioned app URL is the single allowed redirect URI.
    const zitadelResult = await this.zitadelService.createOidcApp({
      name: data.name,
      redirectUris: [data.url],
    })
    if (zitadelResult.isErr()) return err(zitadelResult.error)
    const { appId, clientId } = zitadelResult.value

    const createResult = await this.platformMiniAppRepository.createMiniApp({
      ...data,
      clientId,
      zitadelAppId: appId,
    })
    if (createResult.isErr()) {
      return mapRepositoryError(createResult.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.MINI_APP_SLUG_ALREADY_EXISTS,
          message: `Mini app with the given slug already exists. Note: a Zitadel app was already created with clientId "${clientId}" — reuse it or clean it up in Zitadel.`,
        },
        INTERNAL_SERVER_ERROR: `Failed to create mini app. Note: a Zitadel app was already created with clientId "${clientId}" — reuse it or clean it up in Zitadel.`,
      })
    }

    // Invalidate so the owner sees their new Draft in their list immediately.
    this.miniAppListCache.invalidate()

    return ok({
      ...toMiniAppDto(createResult.value.miniApp),
      notificationKey: createResult.value.notificationApiKey,
    })
  }

  /**
   * Update presentation fields (name/icon/url). When the URL changes, the
   * Zitadel redirect URIs are re-synced first — if that fails the row is left
   * untouched, so the OIDC config and the stored URL never silently diverge.
   */
  async updateMiniApp(id: string, data: UpdatePlatformMiniAppData) {
    const existingResult = await this.platformMiniAppRepository.getMiniAppById(id)
    if (existingResult.isErr()) return mapRepositoryError(existingResult.error, NOT_FOUND)
    const existing = existingResult.value

    if (data.url !== undefined && data.url !== existing.clientUrl && existing.zitadelAppId) {
      const zitadelResult = await this.zitadelService.updateOidcApp(existing.zitadelAppId, {
        redirectUris: [data.url],
      })
      if (zitadelResult.isErr()) return err(zitadelResult.error)
    }

    const updateResult = await this.platformMiniAppRepository.updateMiniApp(id, data)
    if (updateResult.isErr()) return mapRepositoryError(updateResult.error, NOT_FOUND)

    this.miniAppListCache.invalidate()

    return ok(toMiniAppDto(updateResult.value))
  }

  /**
   * Set the effective tier. The platform enforces *who may* change tier
   * (Draft→Beta self-service, Beta→Live approved); today-v2 records the
   * effective value and re-lists accordingly.
   */
  async setTier(id: string, tier: MiniAppTier) {
    // Confirm the target is a platform app (getMiniAppById is scoped to
    // source = PLATFORM), so the platform API can't retier a central-team app.
    const existingResult = await this.platformMiniAppRepository.getMiniAppById(id)
    if (existingResult.isErr()) return mapRepositoryError(existingResult.error, NOT_FOUND)

    const result = await this.platformMiniAppRepository.setTier(id, tier)
    if (result.isErr()) return mapRepositoryError(result.error, NOT_FOUND)

    this.miniAppListCache.invalidate()

    return ok(toMiniAppDto(result.value))
  }

  /** Replace the Live-tier visibility roles (empty = visible to everyone). */
  async setRoles(id: string, roles: string[]) {
    // Scope to platform apps first (see setTier).
    const existingResult = await this.platformMiniAppRepository.getMiniAppById(id)
    if (existingResult.isErr()) return mapRepositoryError(existingResult.error, NOT_FOUND)

    const result = await this.platformMiniAppRepository.setRoles(id, roles)
    if (result.isErr()) return mapRepositoryError(result.error, NOT_FOUND)

    this.miniAppListCache.invalidate()

    return ok(toMiniAppDto(result.value))
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
}
