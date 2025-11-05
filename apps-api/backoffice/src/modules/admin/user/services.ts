import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetUsersQuery, GetUsersResponse, UpdateUserBody, UpdateUserParams } from './models'
import { AdminUserRepository, AdminUserRepositoryPlugin } from './repository'

import { FileServicePlugin } from '../../../plugins/file'

export class AdminUserService {
  constructor(
    private readonly adminUserRepository: AdminUserRepository,
    private readonly fileService: FileService
  ) {}

  async getUsers(query: GetUsersQuery = { limit: 10, page: 1 }) {
    const result = await this.adminUserRepository.getUsers(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    return ok(result.value satisfies GetUsersResponse)
  }

  async updateUserById(userId: UpdateUserParams['userId'], data: UpdateUserBody) {
    const result = await this.adminUserRepository.updateUserById(userId, data)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
        },
      })

    return ok({ message: `User "${result.value.id}" updated.` })
  }
}

export const AdminUserServicePlugin = new Elysia({
  name: 'AdminUserService',
})
  .use([AdminUserRepositoryPlugin, FileServicePlugin])
  .decorate(({ userRepository, fileService }) => ({
    adminUserService: new AdminUserService(userRepository, fileService),
  }))
