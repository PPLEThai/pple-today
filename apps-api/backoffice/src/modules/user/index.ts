import node from '@elysiajs/node'
import Elysia from 'elysia'
import { match, P } from 'ts-pattern'

import { FollowUserParams, FollowUserResponse } from './models'
import { UserService } from './services'

import { InternalErrorCode, InternalErrorCodeSchemas } from '../../dtos/error'
import { authPlugin } from '../../plugins/auth'
import { createErrorSchema } from '../../utils/error'

export const userController = new Elysia({
  prefix: '/user',
  adapter: node(),
})
  .use(authPlugin)
  .post(
    '/:id/follow',
    async ({ params, oidcUser, status }) => {
      const result = await UserService.followUser(oidcUser.sub, params.id)

      if (result.isErr()) {
        return match(result.error)
          .with({ code: InternalErrorCode.USER_NOT_FOUND }, (error) =>
            status(InternalErrorCodeSchemas[error.code].status, { error })
          )
          .with({ code: InternalErrorCode.USER_ALREADY_FOLLOWS }, (error) =>
            status(InternalErrorCodeSchemas[error.code].status, { error })
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (error) =>
            status(InternalErrorCodeSchemas[error.code].status, { error })
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
            (error) => status(InternalErrorCodeSchemas[error.code].status, { error })
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (error) =>
            status(InternalErrorCodeSchemas[error.code].status, { error })
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
