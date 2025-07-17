import { ok } from 'neverthrow'

import { UserRepository } from './repository'

export abstract class UserService {
  static async followUser(userId: string, followedUserId: string) {
    const result = await UserRepository.followUser(userId, followedUserId)

    if (result.isErr()) {
      return result
    }

    return ok()
  }

  static async unfollowUser(userId: string, followedUserId: string) {
    const result = await UserRepository.unfollowUser(userId, followedUserId)

    if (result.isErr()) {
      return result
    }

    return ok()
  }
}
