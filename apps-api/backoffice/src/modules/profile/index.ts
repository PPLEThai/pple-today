import node from '@elysiajs/node'
import Elysia from 'elysia'

import {
  CompleteOnboardingProfileBody,
  CompleteOnboardingProfileResponse,
  FollowUserParams,
  FollowUserResponse,
  GetFollowingUserResponse,
  GetMyProfileResponse,
  GetProfileByIdParams,
  GetProfileByIdResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
} from './models'
import ProfileService from './services'

import { InternalErrorCode } from '../../dtos/error'
import { AuthPlugin } from '../../plugins/auth'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../utils/error'

export const profileController = new Elysia({
  prefix: '/profile',
  adapter: node(),
})
  .use([AuthPlugin, ProfileService])
  .get(
    '/me',
    async ({ oidcUser, status, profileService }) => {
      const result = await profileService.getProfileById(oidcUser.sub)

      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.USER_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, {
        id: result.value.id,
        name: result.value.name,
        role: result.value.role,
        profileImage: result.value.profileImage ?? undefined,
        birthDate: result.value.dateOfBirth?.toISOString() ?? undefined,
        numberOfFollowing: result.value.numberOfFollowing,
        point: result.value.point,
        numberOfFollowingTopics: result.value.numberOfFollowingTopics,
        address: result.value.address
          ? {
              district: result.value.address.district,
              subDistrict: result.value.address.subDistrict,
              province: result.value.address.province,
            }
          : undefined,
      })
    },
    {
      getOIDCUser: true,
      response: {
        200: GetMyProfileResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .patch(
    '/me',
    async ({ body, oidcUser, status, profileService }) => {
      const result = await profileService.updateProfile(oidcUser.sub, body)

      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.USER_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.USER_INVALID_INPUT:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, {
        message: 'User profile updated successfully',
      })
    },
    {
      getOIDCUser: true,
      body: UpdateProfileBody,
      response: {
        200: UpdateProfileResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.USER_INVALID_INPUT,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .get(
    '/:id',
    async ({ status, params, profileService }) => {
      const user = await profileService.getProfileById(params.id)

      if (user.isErr()) {
        switch (user.error.code) {
          case InternalErrorCode.USER_NOT_FOUND:
            return mapErrorCodeToResponse(user.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(user.error, status)
          default:
            exhaustiveGuard(user.error)
        }
      }

      return status(200, {
        id: user.value.id,
        role: user.value.role,
        name: user.value.name,
        profileImage: user.value.profileImage ?? undefined,
        numberOfFollowers: user.value.numberOfFollowers,
        address: user.value.address
          ? {
              district: user.value.address.district,
              subDistrict: user.value.address.subDistrict,
              province: user.value.address.province,
            }
          : undefined,
      })
    },
    {
      getOIDCUser: true,
      params: GetProfileByIdParams,
      response: {
        200: GetProfileByIdResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .post(
    '/on-boarding',
    async ({ oidcUser, status, body, profileService }) => {
      const result = await profileService.completeOnboardingProfile(oidcUser.sub, body)

      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.USER_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.USER_INVALID_INPUT:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.USER_ALREADY_DONE_ONBOARDING:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, {
        message: 'Onboarding completed successfully',
      })
    },
    {
      getOIDCUser: true,
      body: CompleteOnboardingProfileBody,
      response: {
        200: CompleteOnboardingProfileResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.USER_INVALID_INPUT,
          InternalErrorCode.USER_ALREADY_DONE_ONBOARDING,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .get(
    '/follow',
    async ({ oidcUser, status, profileService }) => {
      const result = await profileService.getFollowingUsers(oidcUser.sub)

      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.USER_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      const response = result.value.map((user) => ({
        id: user.id,
        name: user.name,
        profileImage: user.profileImage ?? undefined,
      }))

      return status(200, response)
    },
    {
      getOIDCUser: true,
      response: {
        200: GetFollowingUserResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .post(
    '/:id/follow',
    async ({ params, oidcUser, status, profileService }) => {
      if (oidcUser.sub === params.id) {
        return status(400, {
          error: {
            code: InternalErrorCode.USER_INVALID_INPUT,
            message: 'You cannot follow yourself',
          },
        })
      }

      const result = await profileService.followUser(oidcUser.sub, params.id)

      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.USER_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.USER_ALREADY_FOLLOWS:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, {
        message: `Successfully followed user ${params.id}.`,
      })
    },
    {
      getOIDCUser: true,
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
    }
  )
  .delete(
    '/:id/follow',
    async ({ params, oidcUser, status, profileService }) => {
      const result = await profileService.unfollowUser(oidcUser.sub, params.id)

      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.USER_NOT_FOUND:
          case InternalErrorCode.USER_NOT_FOLLOWS:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, {
        message: `Successfully unfollowed user ${params.id}.`,
      })
    },
    {
      getOIDCUser: true,
      params: FollowUserParams,
      response: {
        200: FollowUserResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_NOT_FOLLOWS,
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
