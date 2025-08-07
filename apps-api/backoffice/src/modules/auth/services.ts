import Elysia from 'elysia'

import { AuthRepository, AuthRepositoryPlugin } from './repository'

import { IntrospectAccessTokenResult } from '../../dtos/auth'
import { InternalErrorCode } from '../../dtos/error'
import { mapRawPrismaError } from '../../utils/prisma'

export class AuthService {
  constructor(private authRepository: AuthRepository) {}

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

    return user
  }

  async registerUser(user: IntrospectAccessTokenResult) {
    const newUser = await this.authRepository.createUser(user)

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
  .use(AuthRepositoryPlugin)
  .decorate(({ authRepository }) => ({
    authService: {
      async getUserById(id: string) {
        const user = await authRepository.getUserById(id)

        if (user.isErr()) {
          return mapRawPrismaError(user.error, {
            RECORD_NOT_FOUND: {
              code: InternalErrorCode.AUTH_USER_NOT_FOUND,
              message: 'User not found',
            },
          })
        }

        return user
      },
      async registerUser(user: IntrospectAccessTokenResult) {
        const newUser = await authRepository.createUser(user)

        if (newUser.isErr()) {
          return mapRawPrismaError(newUser.error, {
            UNIQUE_CONSTRAINT_FAILED: {
              code: InternalErrorCode.AUTH_USER_ALREADY_EXISTS,
              message: 'User already exists',
            },
          })
        }

        return newUser
      },
    },
  }))
