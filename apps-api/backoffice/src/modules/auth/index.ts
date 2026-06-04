import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  CreateMiniAppTokenParams,
  CreateMiniAppTokenQuery,
  CreateMiniAppTokenResponse,
  GetAuthMeResponse,
  RegisterUserResponse,
} from './models'
import { AuthServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'

export const AuthController = new Elysia({
  prefix: '/auth',
  tags: ['Auth'],
})
  .use([AuthGuardPlugin, AuthServicePlugin])
  .post(
    '/register',
    async ({ oidcUser, status, authService }) => {
      const result = await authService.registerUser(oidcUser, oidcUser.pple_roles)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(201, {
        message: 'User registered successfully',
      })
    },
    {
      requiredOIDCUser: true,
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
      const updatedRolesResult = await authService.replaceUserRoles(user.id, user.roles)

      if (updatedRolesResult.isErr()) {
        return mapErrorCodeToResponse(updatedRolesResult.error, status)
      }

      const localInfo = await authService.getUserById(user.id)

      if (localInfo.isErr()) {
        return mapErrorCodeToResponse(localInfo.error, status)
      }

      return status(200, localInfo.value)
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
  .post(
    '/mini-app/:slug',
    async ({ params, user, authService, query, status, headers, authGuard }) => {
      // Use the visible roles of the active role (SSO AD) so an app openable
      // from the list is also tokenable, consistent with `GET /mini-app`.
      const visibleRoles = await authGuard.getAdVisibleRoles(headers)

      if (visibleRoles.isErr()) {
        return mapErrorCodeToResponse(visibleRoles.error, status)
      }

      const result = await authService.generateMiniAppToken(
        params.slug,
        user.accessToken,
        visibleRoles.value,
        query.path
      )

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: CreateMiniAppTokenParams,
      query: CreateMiniAppTokenQuery,
      response: {
        200: CreateMiniAppTokenResponse,
        ...createErrorSchema(
          InternalErrorCode.MINI_APP_NOT_FOUND,
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Generate Mini App Token',
        description: 'Generate a token for a specific mini app',
      },
    }
  )
