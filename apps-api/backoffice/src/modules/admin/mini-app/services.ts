import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  CreateMiniAppBody,
  CreateMiniAppResponse,
  GetMiniAppsResponse,
  UpdateMiniAppBody,
  UpdateMiniAppResponse,
} from './models'
import { AdminMiniAppRepository, AdminMiniAppRepositoryPlugin } from './repository'

export class AdminMiniAppService {
  constructor(private readonly adminMiniAppRepository: AdminMiniAppRepository) {}

  async getMiniApps() {
    const result = await this.adminMiniAppRepository.getMiniApps()
    if (result.isErr()) return mapRepositoryError(result.error)

    return ok(
      result.value.map((miniApp) => ({
        id: miniApp.id,
        name: miniApp.name,
        roles: miniApp.miniAppRoles.map((role) => role.role),
      })) satisfies GetMiniAppsResponse
    )
  }

  async createMiniApp(data: CreateMiniAppBody) {
    const createResult = await this.adminMiniAppRepository.createMiniApp(data)
    if (createResult.isErr())
      return mapRepositoryError(createResult.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.MINI_APP_SLUG_ALREADY_EXISTS,
          message: 'Mini app with the given slug already exists',
        },
      })

    return ok({
      id: createResult.value.id,
      name: createResult.value.name,
      slug: createResult.value.slug,
      iconUrl: createResult.value.icon,
      url: createResult.value.clientUrl,
      clientId: createResult.value.clientId,
      roles: createResult.value.miniAppRoles.map(({ role }) => role),
    } satisfies CreateMiniAppResponse)
  }

  async updateMiniApp(id: string, data: UpdateMiniAppBody) {
    const updateResult = await this.adminMiniAppRepository.updateMiniApp(id, data)
    if (updateResult.isErr())
      return mapRepositoryError(updateResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.MINI_APP_NOT_FOUND,
          message: 'Mini app with the given ID does not exist',
        },
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.MINI_APP_SLUG_ALREADY_EXISTS,
          message: 'Mini app with the given slug already exists',
        },
      })

    return ok({
      id: updateResult.value.id,
      name: updateResult.value.name,
      slug: updateResult.value.slug,
      iconUrl: updateResult.value.icon,
      url: updateResult.value.clientUrl,
      clientId: updateResult.value.clientId,
      roles: updateResult.value.miniAppRoles.map(({ role }) => role),
    } satisfies UpdateMiniAppResponse)
  }

  async deleteMiniApp(id: string) {
    const deleteResult = await this.adminMiniAppRepository.deleteMiniApp(id)
    if (deleteResult.isErr())
      return mapRepositoryError(deleteResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.MINI_APP_NOT_FOUND,
          message: 'Mini app with the given ID does not exist',
        },
      })

    return ok(deleteResult.value)
  }
}

export const AdminMiniAppServicePlugin = new Elysia({
  name: 'AdminMiniAppService',
})
  .use([AdminMiniAppRepositoryPlugin])
  .decorate(({ adminMiniAppRepository }) => ({
    adminMiniAppService: new AdminMiniAppService(adminMiniAppRepository),
  }))
