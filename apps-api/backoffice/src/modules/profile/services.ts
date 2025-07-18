import { err, ok } from 'neverthrow'

import { CompleteOnboardingProfileBody, UpdateUserProfileBody } from './models'
import { UserRepository } from './repository'

import { InternalErrorCode } from '../../dtos/error'
import { mapRawPrismaError } from '../../utils/prisma'
import { AuthRepository } from '../auth/repository'

export abstract class UserService {
  static async getUserById(id: string) {
    const user = await UserRepository.getUserById(id)

    if (user.isErr()) {
      return mapRawPrismaError(user.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
        INTERNAL_SERVER_ERROR: 'An unexpected error occurred while fetching the user',
      })
    }

    return ok(user.value)
  }

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

  static async updateUserProfile(userId: string, userData: UpdateUserProfileBody) {
    const result = await UserRepository.updateUserProfile(userId, {
      name: userData.name,
      profileImage: userData.profileImage,
      address: userData.address
        ? {
            connect: {
              district_subDistrict: {
                district: userData.address.district,
                subDistrict: userData.address.subDistrict,
              },
            },
          }
        : undefined,
    })

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        FOREIGN_KEY_CONSTRAINT_FAILED: {
          code: InternalErrorCode.USER_INVALID_INPUT,
          message: 'Address not found',
        },
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
        INTERNAL_SERVER_ERROR: 'An unexpected error occurred while updating the user profile',
      })
    }

    return ok(result.value)
  }

  static async completeOnboardingProfile(
    userId: string,
    profileData: CompleteOnboardingProfileBody
  ) {
    const user = await AuthRepository.getUserById(userId)

    if (user.isErr()) {
      return mapRawPrismaError(user.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
        INTERNAL_SERVER_ERROR: 'An unexpected error occurred while fetching the user',
      })
    }

    if (!user.value) {
      return err({
        code: InternalErrorCode.USER_ALREADY_DONE_ONBOARDING,
        message: 'User not found',
      })
    }

    const result = await UserRepository.completeOnboarding(userId, profileData)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        FOREIGN_KEY_CONSTRAINT_FAILED: {
          code: InternalErrorCode.USER_INVALID_INPUT,
          message: 'Invalid address or topic',
        },
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
        INTERNAL_SERVER_ERROR: 'An unexpected error occurred',
      })

    return ok(result.value)
  }
}
