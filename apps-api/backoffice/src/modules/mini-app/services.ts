import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { MiniAppRepository, MiniAppRepositoryPlugin } from './repository'

export class MiniAppService {
  constructor(private readonly miniAppRepository: MiniAppRepository) {}

  async listMiniApps(roles: string[]) {
    const miniApps = await this.miniAppRepository.listMiniApps(roles)

    if (miniApps.isErr()) {
      return mapRepositoryError(miniApps.error)
    }

    return ok(
      miniApps.value.map((miniApp) => ({
        slug: miniApp.slug,
        name: miniApp.name,
        iconUrl: miniApp.icon,
        order: miniApp.order,
      }))
    )
  }
}

export const MiniAppServicePlugin = new Elysia({ name: 'MiniAppService' })
  .use([MiniAppRepositoryPlugin])
  .decorate(({ miniAppRepository }) => ({
    miniAppService: new MiniAppService(miniAppRepository),
  }))
