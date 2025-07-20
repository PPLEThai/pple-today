import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import { CompleteOnboardingProfileBody, UpdateUserProfileBody } from './models'
import UserRepository from './repository'

import { InternalErrorCode } from '../../dtos/error'
import { mapRawPrismaError } from '../../utils/prisma'
import { AuthRepository } from '../auth/repository'

const UserService = new Elysia({ name: 'UserService' })
  .use([UserRepository, AuthRepository])
  .derive(({ userRepository, authRepository }) => ({
    userService: {
      async getUserById(id: string) {
        const user = await userRepository.getUserById(id)

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
      },

      async checkFollowableUser(userId: string) {
        const result = await userRepository.checkFollowableUser(userId)

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
      },

      async followUser(userId: string, followedUserId: string) {
        const isFollowable = await userRepository.checkFollowableUser(followedUserId)

        if (isFollowable.isErr())
          return mapRawPrismaError(isFollowable.error, {
            RECORD_NOT_FOUND: {
              code: InternalErrorCode.USER_NOT_FOUND,
              message: 'User not able to follow',
            },
            INTERNAL_SERVER_ERROR: 'An unexpected error occurred',
          })

        const result = await userRepository.followUser(userId, followedUserId)

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
      },

      async unfollowUser(userId: string, followedUserId: string) {
        const isFollowable = await userRepository.checkFollowableUser(followedUserId)

        if (isFollowable.isErr())
          return mapRawPrismaError(isFollowable.error, {
            RECORD_NOT_FOUND: {
              code: InternalErrorCode.USER_NOT_FOUND,
              message: 'User not able to follow',
            },
            INTERNAL_SERVER_ERROR: 'An unexpected error occurred',
          })

        const result = await userRepository.unfollowUser(userId, followedUserId)

        if (result.isErr())
          return mapRawPrismaError(result.error, {
            RECORD_NOT_FOUND: {
              code: InternalErrorCode.USER_NOT_FOLLOWS,
              message: 'User not found or not followed',
            },
            INTERNAL_SERVER_ERROR: 'An unexpected error occurred',
          })

        return ok()
      },

      async updateUserProfile(userId: string, userData: UpdateUserProfileBody) {
        const result = await userRepository.updateUserProfile(userId, {
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
      },

      async completeOnboardingProfile(userId: string, profileData: CompleteOnboardingProfileBody) {
        const user = await authRepository.getUserById(userId)

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

        const result = await userRepository.completeOnboarding(userId, profileData)

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
      },
    },
  }))
  .as('scoped')

export default UserService
