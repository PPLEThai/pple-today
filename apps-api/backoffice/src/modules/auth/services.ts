import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { AuthRepository, AuthRepositoryPlugin } from './repository'

import { UserRole } from '../../../__generated__/prisma'
import { IntrospectAccessTokenResult } from '../../dtos/auth'
import { InternalErrorCode } from '../../dtos/error'
import { mapRawPrismaError } from '../../utils/prisma'
import { FileService, FileServicePlugin } from '../file/services'

export class AuthService {
  constructor(
    private authRepository: AuthRepository,
    private fileService: FileService
  ) {}

  async getUserById(id: string) {
    const user = await this.authRepository.getUserById(id)

    if (user.isErr()) {
      return mapRawPrismaError(user.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.AUTH_USER_NOT_FOUND,
          message: 'User not found',
        },
      })
    }

    return ok({
      id: user.value.id,
      name: user.value.name,
      address: user.value.address ?? undefined,
      profileImage: user.value.profileImage
        ? this.fileService.getPublicFileUrl(user.value.profileImage)
        : undefined,
      role: user.value.role,
    })
  }

  async registerUser(user: IntrospectAccessTokenResult, role: UserRole) {
    const newUser = await this.authRepository.createUser(user, role)

    if (newUser.isErr()) {
      return mapRawPrismaError(newUser.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.AUTH_USER_ALREADY_EXISTS,
          message: 'User already exists',
        },
      })
    }

    return newUser
  }
}

export const AuthServicePlugin = new Elysia({ name: 'AuthService' })
  .use([AuthRepositoryPlugin, FileServicePlugin])
  .decorate(({ authRepository, fileService }) => ({
    authService: new AuthService(authRepository, fileService),
  }))
