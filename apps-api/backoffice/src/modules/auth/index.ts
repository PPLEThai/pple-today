import node from '@elysiajs/node'
import Elysia from 'elysia'

import { GetAuthMeResponse, RegisterUserResponse } from './models'
import { AuthServicePlugin } from './services'

import { InternalErrorCode } from '../../dtos/error'
import { AuthGuardPlugin } from '../../plugins/auth-guard'
import { createErrorSchema, mapErrorCodeToResponse } from '../../utils/error'

export const authController = new Elysia({
  adapter: node(),
  prefix: '/auth',
})
  .use([AuthGuardPlugin, AuthServicePlugin])
  .post(
    '/register',
    async ({ oidcUser, status, authService }) => {
      const result = await authService.registerUser(oidcUser)

      if (result.isErr()) {
        const error = result.error
        switch (error.code) {
          case InternalErrorCode.AUTH_USER_ALREADY_EXISTS:
            return mapErrorCodeToResponse(error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(error, status)
          default:
            throw new Error('Unhandled error code')
        }
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
    async ({ status, oidcUser, authService }) => {
      const localInfo = await authService.getUserById(oidcUser.sub)

      if (localInfo.isErr()) {
        const error = localInfo.error
        switch (error.code) {
          case InternalErrorCode.AUTH_USER_NOT_FOUND:
            return mapErrorCodeToResponse(error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(error, status)
          default:
            throw new Error('Unhandled error code')
        }
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
