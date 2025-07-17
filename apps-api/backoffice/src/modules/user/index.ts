import node from '@elysiajs/node'
import Elysia from 'elysia'

import { FollowUserParams, FollowUserResponse } from './models'
import { UserService } from './services'

import { InternalErrorCode } from '../../dtos/error'
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
        return status(400, {
          error: {
            code: InternalErrorCode.USER_INVALID_INPUT,
            message: 'Invalid input for following user',
          },
        })
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
        return status(400, {
          error: {
            code: InternalErrorCode.USER_INVALID_INPUT,
            message: 'Invalid input for unfollowing user',
          },
        })
      }

      return status(200, {
        message: `Successfully unfollowed user ${params.id}.`,
      })
    },
    {
      getOIDCUser: true,
    }
  )
