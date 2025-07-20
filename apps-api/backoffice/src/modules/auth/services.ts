import node from '@elysiajs/node'
import Elysia from 'elysia'

import { AuthRepository } from './repository'

import { IntrospectAccessTokenResult } from '../../dtos/auth'
import { InternalErrorCode } from '../../dtos/error'
import { mapRawPrismaError } from '../../utils/prisma'

const AuthService = new Elysia({ name: 'AuthService', adapter: node() })
  .use(AuthRepository)
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
            INTERNAL_SERVER_ERROR: 'An unexpected error occurred while fetching the user',
          })
        }

        return user
      },
      async registerUser(oidcUser: IntrospectAccessTokenResult) {
        const newUser = await authRepository.createUser(oidcUser)

        if (newUser.isErr()) {
          return mapRawPrismaError(newUser.error, {
            UNIQUE_CONSTRAINT_FAILED: {
              code: InternalErrorCode.AUTH_USER_ALREADY_EXISTS,
              message: 'User already exists',
            },
            INTERNAL_SERVER_ERROR: 'An unexpected error occurred while registering the user',
          })
        }

        return newUser
      },
    },
  }))
  .as('scoped')

export default AuthService
