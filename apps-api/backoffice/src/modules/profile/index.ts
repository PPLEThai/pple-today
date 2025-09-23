import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  CompleteOnboardingProfileBody,
  CompleteOnboardingProfileResponse,
  CreateProfileUploadUrlBody,
  CreateProfileUploadUrlResponse,
  FollowUserParams,
  FollowUserResponse,
  GetFollowingUserResponse,
  GetMyProfileResponse,
  GetProfileByIdParams,
  GetProfileByIdResponse,
  GetUserParticipationResponse,
  GetUserRecommendationResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
} from './models'
import { ProfileServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'

export const ProfileController = new Elysia({
  prefix: '/profile',
  tags: ['Profile'],
})
  .use([AuthGuardPlugin, ProfileServicePlugin])
  .get(
    '/recommend',
    async ({ user, profileService, status }) => {
      const result = await profileService.getUserRecommendation(user.id)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      response: {
        200: GetUserRecommendationResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get User Recommendations',
        description: "Fetch the authenticated user's recommended users",
      },
    }
  )
  .get(
    '/participation',
    async ({ user, profileService, status }) => {
      const result = await profileService.getUserParticipation(user.id)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      response: {
        200: GetUserParticipationResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get User Participation',
        description: "Fetch the authenticated user's participation",
      },
    }
  )
  .get(
    '/me',
    async ({ user, status, profileService }) => {
      const result = await profileService.getProfileById(user.id)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, {
        id: result.value.id,
        name: result.value.name,
        role: result.value.role,
        profileImage: result.value.profileImage ?? undefined,
        numberOfFollowing: result.value.numberOfFollowing,
        point: result.value.point,
        numberOfFollowingTopics: result.value.numberOfFollowingTopics,
        address: result.value.address
          ? {
              district: result.value.address.district,
              subDistrict: result.value.address.subDistrict,
              province: result.value.address.province,
              postalCode: result.value.address.postalCode,
            }
          : undefined,
      })
    },
    {
      requiredLocalUser: true,
      response: {
        200: GetMyProfileResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get My Profile',
        description: "Fetch the authenticated user's profile information",
      },
    }
  )
  .patch(
    '/me',
    async ({ body, user, status, profileService }) => {
      const result = await profileService.updateProfile(user.id, body)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, {
        message: 'User profile updated successfully',
      })
    },
    {
      requiredLocalUser: true,
      body: UpdateProfileBody,
      response: {
        200: UpdateProfileResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.USER_INVALID_INPUT,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update My Profile',
        description: "Update the authenticated user's profile information",
      },
    }
  )
  .get(
    '/:id',
    async ({ status, params, profileService }) => {
      const user = await profileService.getProfileById(params.id)

      if (user.isErr()) {
        return mapErrorCodeToResponse(user.error, status)
      }

      return status(200, user.value)
    },
    {
      requiredLocalUser: true,
      params: GetProfileByIdParams,
      response: {
        200: GetProfileByIdResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get Profile By ID',
        description: 'Fetch a user profile by its ID',
      },
    }
  )
  .post(
    '/on-boarding',
    async ({ user, status, body, profileService }) => {
      const result = await profileService.completeOnboardingProfile(user.id, body)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, {
        message: 'Onboarding completed successfully',
      })
    },
    {
      requiredLocalUser: true,
      body: CompleteOnboardingProfileBody,
      response: {
        200: CompleteOnboardingProfileResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.USER_INVALID_INPUT,
          InternalErrorCode.USER_ALREADY_DONE_ONBOARDING,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Complete Onboarding',
        description: 'Complete the onboarding process for a user',
      },
    }
  )
  .post(
    '/upload-url',
    async ({ user, status, body, profileService }) => {
      const result = await profileService.createProfileUploadUrl(user.id, body.contentType)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      body: CreateProfileUploadUrlBody,
      response: {
        200: CreateProfileUploadUrlResponse,
        ...createErrorSchema(
          InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
          InternalErrorCode.FILE_UNSUPPORTED_MIME_TYPE
        ),
      },
      detail: {
        summary: 'Get Profile Upload URL',
        description: 'Fetch the signed URL to upload a profile image',
      },
    }
  )
  .get(
    '/follow',
    async ({ user, status, profileService }) => {
      const result = await profileService.getFollowingUsers(user.id)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      const response = result.value.map((user) => ({
        id: user.id,
        name: user.name,
        profileImage: user.profileImage ?? undefined,
      }))

      return status(200, response)
    },
    {
      requiredLocalUser: true,
      response: {
        200: GetFollowingUserResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get Following Users',
        description: 'Fetch the list of users that the authenticated user is following',
      },
    }
  )
  .post(
    '/:id/follow',
    async ({ params, user, status, profileService }) => {
      if (user.id === params.id) {
        return status(400, {
          error: {
            code: InternalErrorCode.USER_INVALID_INPUT,
            message: 'You cannot follow yourself',
          },
        })
      }

      const result = await profileService.followUser(user.id, params.id)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, {
        message: `Successfully followed user ${params.id}.`,
      })
    },
    {
      requiredLocalUser: true,
      params: FollowUserParams,
      response: {
        200: FollowUserResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_ALREADY_FOLLOWS,
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.USER_INVALID_INPUT,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Follow User',
        description: 'Follow a user by their ID',
      },
    }
  )
  .delete(
    '/:id/follow',
    async ({ params, user, status, profileService }) => {
      const result = await profileService.unfollowUser(user.id, params.id)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, {
        message: `Successfully unfollowed user ${params.id}.`,
      })
    },
    {
      requiredLocalUser: true,
      params: FollowUserParams,
      response: {
        200: FollowUserResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_NOT_FOLLOWS,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Unfollow User',
        description: 'Unfollow a user by their ID',
      },
    }
  )
