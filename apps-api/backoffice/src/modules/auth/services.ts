import { err } from 'neverthrow'

import { AuthRepository } from './repository'

import { IntrospectAccessTokenResult } from '../../dtos/auth'

export abstract class AuthService {
  static async getUserById(id: string) {
    const user = await AuthRepository.getUserById(id)

    return user
  }

  static async registerUser(oidcUser: IntrospectAccessTokenResult) {
    const existingUser = await AuthRepository.getUserById(oidcUser.sub)
    if (existingUser) {
      return err({
        code: 'USER_ALREADY_EXISTS',
        message: 'User with this ID already exists',
      })
    }

    const newUser = await AuthRepository.createUser(oidcUser)

    return newUser
  }
}
