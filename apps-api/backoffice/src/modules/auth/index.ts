import Elysia from 'elysia'

import { GetAuthMeResponse, RegisterUserResponse } from './models'
import { AuthServicePlugin } from './services'

import { InternalErrorCode } from '../../dtos/error'
import { AuthGuardPlugin } from '../../plugins/auth-guard'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../utils/error'

export const AuthController = new Elysia({
  prefix: '/auth',
  tags: ['Auth'],
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
      fetchOIDCUser: true,
      response: {
        201: RegisterUserResponse,
        ...createErrorSchema(
          InternalErrorCode.AUTH_USER_ALREADY_EXISTS,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Register user',
        description: 'Create a new user account',
      },
    }
  )
  .get(
    '/me',
    async ({ status, user, authService }) => {
      const localInfo = await authService.getUserById(user.id)

      if (localInfo.isErr()) {
        const error = localInfo.error
        switch (error.code) {
          case InternalErrorCode.AUTH_USER_NOT_FOUND:
            return mapErrorCodeToResponse(error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(error, status)
          default:
            exhaustiveGuard(error)
        }
      }

      return status(200, {
        id: user.id,
        name: user.name,
      })
    },
    {
      requiredLocalUser: true,
      response: {
        200: GetAuthMeResponse,
        ...createErrorSchema(
          InternalErrorCode.AUTH_USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get authenticated user',
        description: 'Fetch the currently authenticated user details',
      },
    }
  )
