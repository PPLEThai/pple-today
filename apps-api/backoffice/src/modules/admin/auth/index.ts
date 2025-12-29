import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { GetAuthMeResponse } from './models'
import { AdminAuthServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminAuthController = new Elysia({
  prefix: '/auth',
  tags: ['Admin Auth'],
})
  .use([AdminAuthServicePlugin, AdminAuthGuardPlugin])
  .get(
    '/me',
    async ({ status, adminAuthService, user }) => {
      const localInfo = await adminAuthService.getUserById(user.id)

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
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get authenticated user',
        description: 'Fetch the currently authenticated user details',
      },
    }
  )
