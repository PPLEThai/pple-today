import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  GetUserByIdParams,
  GetUserByIdResponse,
  GetUsersQuery,
  GetUsersResponse,
  UpdateUserBody,
  UpdateUserParams,
} from './models'
import { AdminUserRepository, AdminUserRepositoryPlugin } from './repository'

export class AdminUserService {
  constructor(private readonly adminUserRepository: AdminUserRepository) {}

  async getUsers(query: GetUsersQuery = { limit: 10, page: 1 }) {
    const result = await this.adminUserRepository.getUsers(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    return ok(result.value satisfies GetUsersResponse)
  }

  async getUserById(userId: GetUserByIdParams['userId']) {
    const result = await this.adminUserRepository.getUserById(userId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetUserByIdResponse)
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
  .use([AdminUserRepositoryPlugin])
  .decorate(({ userRepository }) => ({
    adminUserService: new AdminUserService(userRepository),
  }))
