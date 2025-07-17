import { err, ok } from 'neverthrow'

import { UserRepository } from './repository'

import { InternalErrorCode } from '../../dtos/error'
import { mapRawPrismaError } from '../../utils/prisma'

export abstract class UserService {
  static async checkFollowableUser(userId: string) {
    const result = await UserRepository.checkFollowableUser(userId)

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found or not followable',
        },
        INTERNAL_SERVER_ERROR: 'An unexpected error occurred',
      })
    }

    if (!result.value)
      return err({
        code: InternalErrorCode.USER_NOT_FOUND,
        message: 'User not found or not followable',
      })

    return ok()
  }

  static async followUser(userId: string, followedUserId: string) {
    const isFollowable = await UserService.checkFollowableUser(followedUserId)

    if (isFollowable.isErr()) return isFollowable

    const result = await UserRepository.followUser(userId, followedUserId)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        FOREIGN_KEY_CONSTRAINT_FAILED: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.USER_ALREADY_FOLLOWS,
          message: 'User already follows this user',
        },
        INTERNAL_SERVER_ERROR: 'An unexpected error occurred',
      })

    return ok()
  }

  static async unfollowUser(userId: string, followedUserId: string) {
    const isFollowable = await UserService.checkFollowableUser(followedUserId)

    if (isFollowable.isErr()) return isFollowable

    const result = await UserRepository.unfollowUser(userId, followedUserId)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOLLOWS,
          message: 'User not found or not followed',
        },
        INTERNAL_SERVER_ERROR: 'An unexpected error occurred',
      })

    return ok()
  }
}
