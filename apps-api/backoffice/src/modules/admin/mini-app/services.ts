import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetMiniAppsResponse } from './models'
import { AdminMiniAppRepository, AdminMiniAppRepositoryPlugin } from './repository'

export class AdminMiniAppService {
  constructor(private readonly adminMiniAppRepository: AdminMiniAppRepository) {}

  async getMiniApps() {
    const result = await this.adminMiniAppRepository.getMiniApps()
    if (result.isErr()) return mapRepositoryError(result.error)

    return ok(result.value satisfies GetMiniAppsResponse)
  }
}

export const AdminMiniAppServicePlugin = new Elysia({
  name: 'AdminMiniAppService',
})
  .use([AdminMiniAppRepositoryPlugin])
  .decorate(({ adminMiniAppRepository }) => ({
    adminMiniAppService: new AdminMiniAppService(adminMiniAppRepository),
  }))
