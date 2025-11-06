import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetDashboardInfoResponse } from './models'
import { AdminDashboardRepository, AdminDashboardRepositoryPlugin } from './repository'

export class AdminDashboardService {
  constructor(private readonly adminDashboardRepository: AdminDashboardRepository) {}

  async getDashboardInfo() {
    const result = await this.adminDashboardRepository.getDashboardInfo()
    if (result.isErr()) return mapRepositoryError(result.error, {})

    return ok(result.value satisfies GetDashboardInfoResponse)
  }
}

export const AdminDashboardServicePlugin = new Elysia({
  name: 'AdminDashboardService',
})
  .use([AdminDashboardRepositoryPlugin])
  .decorate(({ adminDashboardRepository }) => ({
    adminDashboardService: new AdminDashboardService(adminDashboardRepository),
  }))
