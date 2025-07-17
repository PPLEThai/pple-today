import { AuthRepository } from './repository'

import { IntrospectAccessTokenResult } from '../../dtos/auth'
import { InternalErrorCode } from '../../dtos/error'
import { mapRawPrismaError } from '../../utils/prisma'

export abstract class AuthService {
  static async getUserById(id: string) {
    const user = await AuthRepository.getUserById(id)

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
  }

  static async registerUser(oidcUser: IntrospectAccessTokenResult) {
    const newUser = await AuthRepository.createUser(oidcUser)

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
  }
}
