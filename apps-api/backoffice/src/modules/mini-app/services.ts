import { mapRepositoryError } from '@pple-today/api-common/utils'
import { MiniAppTier } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { AppUserService } from './app-user-service'
import { selectVisibleMiniApps } from './eligibility'
import { InviteNotifier } from './invite-notifier'
import { MiniAppInviteRepository } from './invite-repository'
import { MiniAppInviteService } from './invite-service'
import {
  MiniAppInviteRepositoryPlugin,
  MiniAppRepository,
  MiniAppRepositoryPlugin,
  MiniAppUserRepositoryPlugin,
} from './repository'

import { ElysiaLoggerPlugin } from '../../plugins/log'
import { MiniAppListCache, MiniAppListCachePlugin } from '../../plugins/mini-app-cache'
import { NotificationRepositoryPlugin } from '../notification/repository'

export class MiniAppService {
  constructor(
    private readonly miniAppRepository: MiniAppRepository,
    private readonly miniAppListCache: MiniAppListCache,
    private readonly miniAppInviteRepository: MiniAppInviteRepository
  ) {}

  /**
   * List the mini apps visible to the requesting user.
   *
   * @param roles   `pple-ad:`-prefixed visible roles resolved from SSO AD.
   * @param userSub The user's PPLE ID `sub`, or `null` for anonymous users.
   *                Used to gate owner-only (DRAFT) and invite-gated (BETA) apps.
   */
  async listMiniApps(roles: string[], userSub: string | null) {
    let miniApps = this.miniAppListCache.get()

    if (!miniApps) {
      const result = await this.miniAppRepository.listMiniApps()

      if (result.isErr()) {
        return mapRepositoryError(result.error)
      }

      miniApps = result.value
      this.miniAppListCache.set(miniApps)
    }

    // Accepted invites are the only per-user fact the cached list cannot carry,
    // so they are read per request — but only when they could possibly matter.
    // Beta apps are a handful of rows, so on the overwhelmingly common request
    // (no Beta app in the catalogue, or an anonymous caller) this costs nothing.
    let acceptedInviteMiniAppIds: ReadonlySet<string> = new Set()
    if (userSub !== null && miniApps.some((miniApp) => miniApp.tier === MiniAppTier.BETA)) {
      const invites = await this.miniAppInviteRepository.listAcceptedMiniAppIds(userSub)

      if (invites.isErr()) {
        return mapRepositoryError(invites.error)
      }

      acceptedInviteMiniAppIds = invites.value
    }

    // Eligibility filtering happens here in the backend layer, over the full
    // cached mini-app list, rather than in the database query, so the cached
    // data can be reused across requests with different roles and users.
    return ok(selectVisibleMiniApps(miniApps, { roles, sub: userSub, acceptedInviteMiniAppIds }))
  }
}

export const MiniAppServicePlugin = new Elysia({ name: 'MiniAppService' })
  .use([MiniAppRepositoryPlugin, MiniAppListCachePlugin, MiniAppInviteRepositoryPlugin])
  .decorate(({ miniAppRepository, miniAppListCache, miniAppInviteRepository }) => ({
    miniAppService: new MiniAppService(
      miniAppRepository,
      miniAppListCache,
      miniAppInviteRepository
    ),
  }))

export const MiniAppInviteServicePlugin = new Elysia({ name: 'MiniAppInviteService' })
  .use([
    MiniAppInviteRepositoryPlugin,
    NotificationRepositoryPlugin,
    ElysiaLoggerPlugin({ name: 'InviteNotifier' }),
  ])
  .decorate(({ miniAppInviteRepository, notificationRepository, loggerService }) => ({
    miniAppInviteService: new MiniAppInviteService(
      miniAppInviteRepository,
      new InviteNotifier(notificationRepository, loggerService)
    ),
  }))

export const AppUserServicePlugin = new Elysia({ name: 'AppUserService' })
  .use([MiniAppUserRepositoryPlugin, ElysiaLoggerPlugin({ name: 'AppUserService' })])
  .decorate(({ miniAppUserRepository, loggerService }) => ({
    appUserService: new AppUserService(miniAppUserRepository, loggerService),
  }))
