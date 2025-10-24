import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { MiniAppRepository, MiniAppRepositoryPlugin } from './repository'

export class MiniAppService {
  constructor(private readonly miniAppRepository: MiniAppRepository) {}

  async listMiniApps() {
    const miniApps = await this.miniAppRepository.listMiniApps()

    if (miniApps.isErr()) {
      return mapRepositoryError(miniApps.error)
    }

    return ok(
      miniApps.value.map((miniApp) => ({
        id: miniApp.id,
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
