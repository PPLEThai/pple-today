import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { MiniAppRepository, MiniAppRepositoryPlugin } from './repository'

import { MiniAppListCache, MiniAppListCachePlugin } from '../../plugins/mini-app-cache'

export class MiniAppService {
  constructor(
    private readonly miniAppRepository: MiniAppRepository,
    private readonly miniAppListCache: MiniAppListCache
  ) {}

  async listMiniApps(roles: string[]) {
    let miniApps = this.miniAppListCache.get()

    if (!miniApps) {
      const result = await this.miniAppRepository.listMiniApps()

      if (result.isErr()) {
        return mapRepositoryError(result.error)
      }

      miniApps = result.value
      this.miniAppListCache.set(miniApps)
    }

    // Eligibility (role-based) filtering happens here in the backend layer,
    // over the full cached mini-app list, rather than in the database query,
    // so the cached data can be reused across requests with different roles.
    const eligibleMiniApps = miniApps.filter(
      (miniApp) =>
        miniApp.miniAppRoles.length === 0 ||
        miniApp.miniAppRoles.some((miniAppRole) => roles.includes(miniAppRole.role))
    )

    return ok(
      eligibleMiniApps.map((miniApp) => ({
        slug: miniApp.slug,
        name: miniApp.name,
        iconUrl: miniApp.icon,
        order: miniApp.order,
        url: miniApp.clientUrl,
      }))
    )
  }
}

export const MiniAppServicePlugin = new Elysia({ name: 'MiniAppService' })
  .use([MiniAppRepositoryPlugin, MiniAppListCachePlugin])
  .decorate(({ miniAppRepository, miniAppListCache }) => ({
    miniAppService: new MiniAppService(miniAppRepository, miniAppListCache),
  }))
