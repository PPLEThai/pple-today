import { err } from 'neverthrow'
import { match } from 'ts-pattern'

import { AuthRepository } from './repository'

import { IntrospectAccessTokenResult } from '../../dtos/auth'
import { InternalErrorCode } from '../../dtos/error'

export abstract class AuthService {
  static async getUserById(id: string) {
    const user = await AuthRepository.getUserById(id)

    if (user.isErr()) {
      return err(
        match(user.error)
          .with(
            {
              code: 'RECORD_NOT_FOUND',
            },
            () => ({
              code: InternalErrorCode.AUTH_USER_NOT_FOUND,
              message: 'User not found',
            })
          )
          .otherwise(() => ({
            code: InternalErrorCode.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred while fetching the user',
          }))
      )
    }

    return user
  }

  static async registerUser(oidcUser: IntrospectAccessTokenResult) {
    const newUser = await AuthRepository.createUser(oidcUser)

    if (newUser.isErr()) {
      return err(
        match(newUser.error)
          .with(
            {
              code: 'UNIQUE_CONSTRAINT_FAILED',
            },
            () => ({
              code: InternalErrorCode.AUTH_USER_ALREADY_EXISTS,
              message: 'User with this ID already exists',
            })
          )
          .otherwise(() => ({
            code: InternalErrorCode.INTERNAL_SERVER_ERROR,
            message: 'An unexpected error occurred while registering the user',
          }))
      )
    }

    return newUser
  }
}
