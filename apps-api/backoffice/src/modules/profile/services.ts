import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import { CompleteOnboardingProfileBody, UpdateProfileBody } from './models'
import { ProfileRepository, ProfileRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../dtos/error'
import { mapRawPrismaError } from '../../utils/prisma'
import { AuthRepository, AuthRepositoryPlugin } from '../auth/repository'
import { FileService, FileServicePlugin } from '../file/services'

export class ProfileService {
  constructor(
    private profileRepository: ProfileRepository,
    private authRepository: AuthRepository,
    private fileService: FileService
  ) {}
  async getProfileById(id: string) {
    const user = await this.profileRepository.getProfileById(id)

    if (user.isErr()) {
      return mapRawPrismaError(user.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
      })
    }

    return ok(user.value)
  }

  async followUser(userId: string, followedUserId: string) {
    const result = await this.profileRepository.followUser(userId, followedUserId)

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
      })

    return ok()
  }

  async unfollowUser(userId: string, followedUserId: string) {
    const result = await this.profileRepository.unfollowUser(userId, followedUserId)

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOLLOWS,
          message: 'User not found or not followed',
        },
      })

    return ok()
  }

  async getFollowingUsers(userId: string) {
    const result = await this.profileRepository.getFollowingUsers(userId)

    if (result.isErr()) {
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
      })
    }

    return ok(result.value.followings.map((user) => user.followed))
  }

  async updateProfile(userId: string, userData: UpdateProfileBody) {
    const result = await this.profileRepository.updateUserProfile(userId, {
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
      })
    }

    return ok(result.value)
  }

  async completeOnboardingProfile(userId: string, profileData: CompleteOnboardingProfileBody) {
    const user = await this.authRepository.getUserById(userId)

    if (user.isErr()) {
      return mapRawPrismaError(user.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
      })
    }

    if (!user.value) {
      return err({
        code: InternalErrorCode.USER_ALREADY_DONE_ONBOARDING,
        message: 'User not found',
      })
    }

    const result = await this.profileRepository.completeOnboarding(userId, profileData)

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
      })

    return ok(result.value)
  }

  async getProfileUploadUrl(userId: string) {
    const fileKey = `users/profile-picture-${userId}.png`
    const uploadUrl = await this.fileService.getUploadSignedUrl(fileKey, {
      contentType: 'image/png',
    })

    if (uploadUrl.isErr()) {
      return err(uploadUrl.error)
    }

    return ok({
      fileKey,
      uploadFields: uploadUrl.value.fields,
      uploadUrl: uploadUrl.value.url,
    })
  }
}

export const ProfileServicePlugin = new Elysia({ name: 'ProfileService' })
  .use([ProfileRepositoryPlugin, AuthRepositoryPlugin, FileServicePlugin])
  .decorate(({ profileRepository, authRepository, fileService }) => ({
    profileService: new ProfileService(profileRepository, authRepository, fileService),
  }))
