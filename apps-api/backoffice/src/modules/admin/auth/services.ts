import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { AdminAuthRepository, AdminAuthRepositoryPlugin } from './repository'

import { FileServicePlugin } from '../../../plugins/file'

export class AuthService {
  constructor(private authRepository: AdminAuthRepository) {}

  async getUserById(id: string) {
    const user = await this.authRepository.getUserById(id)

    if (user.isErr()) {
      return mapRepositoryError(user.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.AUTH_USER_NOT_FOUND,
          message: 'User not found',
        },
      })
    }

    return ok({
      id: user.value.id,
      name: user.value.name,
    })
  }
}

export const AdminAuthServicePlugin = new Elysia({ name: 'AdminAuthService' })
  .use([AdminAuthRepositoryPlugin, FileServicePlugin])
  .decorate(({ adminAuthRepository }) => ({
    adminAuthService: new AuthService(adminAuthRepository),
  }))
