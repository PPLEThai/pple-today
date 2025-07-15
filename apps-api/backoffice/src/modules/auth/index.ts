import node from '@elysiajs/node'
import Elysia from 'elysia'

import { GetAuthMeHeaders, GetAuthMeResponse, RegisterUserResponse } from './models'
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
        return status(409, {
          error: {
            code: InternalErrorCode.AUTH_USER_ALREADY_EXISTS,
            message: 'User with this ID already exists',
            data: {
              helloWorld: 'User with this ID already exists',
            },
          },
        })
      }

      return status(201, {
        message: 'User registered successfully',
      })
    },
    {
      getOIDCUser: true,
      response: {
        201: RegisterUserResponse,
        ...createErrorSchema(InternalErrorCode.AUTH_USER_ALREADY_EXISTS),
      },
    }
  )
  .get(
    '/me',
    async ({ status, oidcUser }) => {
      const localInfo = await AuthService.getUserById(oidcUser.sub)
      if (!localInfo) {
        return status(404, {
          error: {
            code: InternalErrorCode.NOT_FOUND,
            message: 'User not found',
          },
        })
      }

      return status(200, {
        id: oidcUser.sub,
        name: oidcUser.name,
      })
    },
    {
      headers: GetAuthMeHeaders,
      getOIDCUser: true,
      response: {
        200: GetAuthMeResponse,
        ...createErrorSchema(InternalErrorCode.UNAUTHORIZED, InternalErrorCode.NOT_FOUND),
      },
    }
  )
