import node from '@elysiajs/node'
import Elysia from 'elysia'
import { match, P } from 'ts-pattern'

import {
  CompleteOnboardingProfileBody,
  CompleteOnboardingProfileResponse,
  FollowUserParams,
  FollowUserResponse,
  GetMyUserProfilesResponse,
  GetUserProfileByIdParams,
  GetUserProfileByIdResponse,
  UpdateUserProfileBody,
  UpdateUserProfileResponse,
} from './models'
import { UserService } from './services'

import { InternalErrorCode } from '../../dtos/error'
import { authPlugin } from '../../plugins/auth'
import { createErrorSchema, mapErrorCodeToResponse } from '../../utils/error'

export const profileController = new Elysia({
  prefix: '/profile',
  adapter: node(),
})
  .use(authPlugin)
  .get(
    '/me',
    async ({ oidcUser, status }) => {
      const result = await UserService.getUserById(oidcUser.sub)

      if (result.isErr()) {
        return match(result.error)
          .with({ code: InternalErrorCode.USER_NOT_FOUND }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .exhaustive()
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
        200: GetMyUserProfilesResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .patch(
    '/me',
    async ({ body, oidcUser, status }) => {
      const result = await UserService.updateUserProfile(oidcUser.sub, body)

      if (result.isErr()) {
        return match(result.error)
          .with({ code: InternalErrorCode.USER_NOT_FOUND }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.USER_INVALID_INPUT }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .exhaustive()
      }

      return status(200, {
        message: 'User profile updated successfully',
      })
    },
    {
      getOIDCUser: true,
      body: UpdateUserProfileBody,
      response: {
        200: UpdateUserProfileResponse,
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
    async ({ status, params }) => {
      const user = await UserService.getUserById(params.id)

      if (user.isErr()) {
        return match(user.error)
          .with({ code: InternalErrorCode.USER_NOT_FOUND }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .exhaustive()
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
      params: GetUserProfileByIdParams,
      response: {
        200: GetUserProfileByIdResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .post(
    '/on-boarding',
    async ({ oidcUser, status, body }) => {
      const result = await UserService.completeOnboardingProfile(oidcUser.sub, body)

      if (result.isErr()) {
        return match(result.error)
          .with({ code: InternalErrorCode.USER_NOT_FOUND }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.USER_INVALID_INPUT }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.USER_ALREADY_DONE_ONBOARDING }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .exhaustive()
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
  .post(
    '/:id/follow',
    async ({ params, oidcUser, status }) => {
      if (oidcUser.sub === params.id) {
        return status(400, {
          error: {
            code: InternalErrorCode.USER_INVALID_INPUT,
            message: 'You cannot follow yourself',
          },
        })
      }

      const result = await UserService.followUser(oidcUser.sub, params.id)

      if (result.isErr()) {
        return match(result.error)
          .with({ code: InternalErrorCode.USER_NOT_FOUND }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.USER_ALREADY_FOLLOWS }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .exhaustive()
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
    async ({ params, oidcUser, status }) => {
      const result = await UserService.unfollowUser(oidcUser.sub, params.id)

      if (result.isErr()) {
        return match(result.error)
          .with(
            { code: P.union(InternalErrorCode.USER_NOT_FOLLOWS, InternalErrorCode.USER_NOT_FOUND) },
            (e) => mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .exhaustive()
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
  .group('/pages', (app) => {
    return app
      .get('/', async () => {})
      .put('/', async () => {})
      .delete('/:id', async () => {})
      .post('/token', async () => {})
  })
