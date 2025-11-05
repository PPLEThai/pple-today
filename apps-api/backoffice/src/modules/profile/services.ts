import { createId } from '@paralleldrive/cuid2'
import { ImageFileMimeType, InternalErrorCode } from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { err, ok } from 'neverthrow'
import * as R from 'remeda'

import {
  CompleteOnboardingProfileBody,
  GetUserParticipationResponse,
  GetUserRecommendationResponse,
  UpdateProfileBody,
} from './models'
import { ProfileRepository, ProfileRepositoryPlugin } from './repository'

import { FileServicePlugin } from '../../plugins/file'
import { AuthRepository, AuthRepositoryPlugin } from '../auth/repository'
import { FileServerService, FileServerServicePlugin } from '../files/services'

export class ProfileService {
  constructor(
    private profileRepository: ProfileRepository,
    private authRepository: AuthRepository,
    private fileService: FileService,
    private fileServerService: FileServerService
  ) {}

  async getUserRecommendation(userId: string) {
    const result = await this.profileRepository.getUserRecommendation(userId)

    if (result.isErr()) {
      return mapRepositoryError(result.error)
    }

    const users: GetUserRecommendationResponse = result.value.map((user) => ({
      id: user.id,
      name: user.name,
      profileImage: user.profileImagePath
        ? this.fileServerService.getFileEndpointUrl(user.profileImagePath)
        : null,
      address: user.address
        ? {
            province: user.address.province,
            district: user.address.district,
          }
        : null,
    }))

    return ok(users)
  }

  // TODO: Add election to recent activity or formulate new table for activity
  async getUserParticipation(userId: string) {
    const result = await this.profileRepository.getUserParticipation(userId)

    if (result.isErr()) {
      return mapRepositoryError(result.error)
    }

    const transformResult: GetUserParticipationResponse = R.pipe(
      result.value,
      R.map((poll) => ({
        type: 'POLL' as const,
        feedItemId: poll.feedItemId,
        title: poll.title,
        createdAt: R.pipe(
          poll.options,
          R.map((option) => option.pollAnswers[0].createdAt),
          R.flat(),
          R.firstBy([R.identity(), 'desc'])
        )!,
      }))
    )

    return ok(transformResult)
  }

  async getProfileById(id: string) {
    const user = await this.profileRepository.getProfileById(id)

    if (user.isErr()) {
      return mapRepositoryError(user.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
      })
    }

    return ok({
      ...user.value,
      address: user.value.address ?? undefined,
      profileImage: user.value.profileImagePath
        ? this.fileServerService.getFileEndpointUrl(user.value.profileImagePath)
        : undefined,
      roles: user.value.roles.map((r) => r.role),
    })
  }

  async followUser(userId: string, followingUserId: string) {
    const result = await this.profileRepository.followUser(userId, followingUserId)

    if (result.isErr())
      return mapRepositoryError(result.error, {
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

  async unfollowUser(userId: string, followingUserId: string) {
    const result = await this.profileRepository.unfollowUser(userId, followingUserId)

    if (result.isErr())
      return mapRepositoryError(result.error, {
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
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
      })
    }

    return ok(
      result.value.followers.map((user) => ({
        ...user.following,
        address: user.following.address ?? undefined,
        profileImage: user.following.profileImagePath
          ? this.fileServerService.getFileEndpointUrl(user.following.profileImagePath)
          : undefined,
      }))
    )
  }

  async updateProfile(userId: string, userData: UpdateProfileBody) {
    const result = await this.profileRepository.updateUserProfile(userId, {
      name: userData.name,
      profileImagePath: userData.profileImagePath,
      address: userData.address
        ? {
            connect: {
              province_district_subDistrict_postalCode: {
                province: userData.address.province,
                district: userData.address.district,
                subDistrict: userData.address.subDistrict,
                postalCode: userData.address.postalCode,
              },
            },
          }
        : undefined,
    })

    if (result.isErr()) {
      return mapRepositoryError(result.error, {
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

    return ok({
      ...result.value,
      address: result.value.address ?? undefined,
      profileImage: result.value.profileImagePath
        ? this.fileServerService.getFileEndpointUrl(result.value.profileImagePath)
        : undefined,
    })
  }

  async completeOnboardingProfile(userId: string, profileData: CompleteOnboardingProfileBody) {
    const user = await this.authRepository.getUserById(userId)

    if (user.isErr()) {
      return mapRepositoryError(user.error, {
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
      return mapRepositoryError(result.error, {
        FOREIGN_KEY_CONSTRAINT_FAILED: {
          code: InternalErrorCode.USER_INVALID_INPUT,
          message: 'Invalid address or topic',
        },
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.USER_NOT_FOUND,
          message: 'User not found',
        },
      })

    return ok({
      ...result.value,
      address: result.value.address ?? undefined,
      profileImage: result.value.profileImagePath
        ? this.fileServerService.getFileEndpointUrl(result.value.profileImagePath)
        : undefined,
    })
  }

  async createProfileUploadUrl(userId: string, contentType: ImageFileMimeType) {
    const fileKeyResult = this.fileService.getFilePathFromMimeType(
      `temp/users/${userId}/profile-picture-${userId}-${createId()}`,
      contentType
    )

    if (fileKeyResult.isErr()) return err(fileKeyResult.error)

    const fileKey = fileKeyResult.value
    const uploadUrl = await this.fileService.createUploadSignedUrl(fileKey, {
      contentType,
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
  .use([ProfileRepositoryPlugin, AuthRepositoryPlugin, FileServicePlugin, FileServerServicePlugin])
  .decorate(({ profileRepository, authRepository, fileService, fileServerService }) => ({
    profileService: new ProfileService(
      profileRepository,
      authRepository,
      fileService,
      fileServerService
    ),
  }))
