import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { selectVisibleMiniApps } from './eligibility'
import { MiniAppRepository, MiniAppRepositoryPlugin } from './repository'

import { MiniAppListCache, MiniAppListCachePlugin } from '../../plugins/mini-app-cache'

export class MiniAppService {
  constructor(
    private readonly miniAppRepository: MiniAppRepository,
    private readonly miniAppListCache: MiniAppListCache
  ) {}

  /**
   * List the mini apps visible to the requesting user.
   *
   * @param roles   `pple-ad:`-prefixed visible roles resolved from SSO AD.
   * @param userSub The user's PPLE ID `sub`, or `null` for anonymous users.
   *                Used to gate owner-only (DRAFT/BETA) apps.
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

    // Eligibility filtering happens here in the backend layer, over the full
    // cached mini-app list, rather than in the database query, so the cached
    // data can be reused across requests with different roles and users.
    return ok(selectVisibleMiniApps(miniApps, roles, userSub))
  }
}

export const MiniAppServicePlugin = new Elysia({ name: 'MiniAppService' })
  .use([MiniAppRepositoryPlugin, MiniAppListCachePlugin])
  .decorate(({ miniAppRepository, miniAppListCache }) => ({
    miniAppService: new MiniAppService(miniAppRepository, miniAppListCache),
  }))
