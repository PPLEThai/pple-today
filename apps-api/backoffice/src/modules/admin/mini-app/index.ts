import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { GetMiniAppsResponse } from './models'
import { AdminMiniAppServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminMiniAppController = new Elysia({
  prefix: '/mini-app',
  tags: ['Admin Mini App'],
})
  .use([AdminMiniAppServicePlugin, AdminAuthGuardPlugin])
  .get(
    '/',
    async ({ adminMiniAppService, status }) => {
      const result = await adminMiniAppService.getMiniApps()
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)
      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      response: {
        200: GetMiniAppsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get all mini apps',
        description: 'Fetch all mini app sorted by createdAt',
      },
    }
  )
