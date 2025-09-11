import { InternalErrorCode, PPLERole } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import { UserRole } from '@pple-today/database/prisma'
import Elysia from 'elysia'

import { GetAuthMeResponse, RegisterUserResponse } from './models'
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
      let role: UserRole
      switch (oidcUser.pple_roles[0]) {
        case PPLERole.MP:
          role = UserRole.REPRESENTATIVE
          break
        case PPLERole.PROVINCE:
        case PPLERole.CANDIDATE:
        case PPLERole.LOCAL:
        case PPLERole.MPASSISTANT:
        case PPLERole.TTO:
        case PPLERole.HQ:
          role = UserRole.STAFF
          break
        case PPLERole.FOUNDATION:
          role = UserRole.STAFF
          break
        default:
          role = UserRole.USER
      }

      const result = await authService.registerUser(oidcUser, role)

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
