import node from '@elysiajs/node'
import Elysia from 'elysia'
import { match } from 'ts-pattern'

import { GetAuthMeResponse, RegisterUserResponse } from './models'
import { AuthService } from './services'

import { InternalErrorCode } from '../../dtos/error'
import { authPlugin } from '../../plugins/auth'
import { createErrorSchema } from '../../utils/error'

export const authController = new Elysia({
  adapter: node(),
  prefix: '/auth',
})
  .use(authPlugin)
  .post(
    '/register',
    async ({ oidcUser, status }) => {
      const result = await AuthService.registerUser(oidcUser)

      if (result.isErr()) {
        return match(result.error)
          .with(
            {
              code: InternalErrorCode.AUTH_USER_ALREADY_EXISTS,
            },
            (err) => status(409, { error: err })
          )
          .otherwise((err) => status(500, { error: err }))
      }

      return status(201, {
        message: 'User registered successfully',
      })
    },
    {
      getOIDCUser: true,
      response: {
        201: RegisterUserResponse,
        ...createErrorSchema(
          InternalErrorCode.AUTH_USER_ALREADY_EXISTS,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .get(
    '/me',
    async ({ status, oidcUser }) => {
      const localInfo = await AuthService.getUserById(oidcUser.sub)

      if (localInfo.isErr()) {
        return match(localInfo.error)
          .with(
            {
              code: InternalErrorCode.AUTH_USER_NOT_FOUND,
            },
            (err) => status(401, { error: err })
          )
          .otherwise((err) => status(500, { error: err }))
      }

      return status(200, {
        id: oidcUser.sub,
        name: oidcUser.name,
      })
    },
    {
      getOIDCUser: true,
      response: {
        200: GetAuthMeResponse,
        ...createErrorSchema(
          InternalErrorCode.AUTH_USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
