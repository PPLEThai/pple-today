import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { GetDashboardInfoResponse } from './models'
import { AdminDashboardServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminDashboardController = new Elysia({
  prefix: '/dashboard',
  tags: ['Admin Dashboard'],
})
  .use([AdminAuthGuardPlugin, AdminDashboardServicePlugin])
  .get(
    '/',
    async ({ status, adminDashboardService }) => {
      const result = await adminDashboardService.getDashboardInfo()
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      response: {
        200: GetDashboardInfoResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get dashboard info',
        description: 'Fetch dashboard information',
      },
    }
  )
