import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia, { t } from 'elysia'

import { GetUsersQuery, GetUsersResponse } from './models'
import { AdminUserServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminUserController = new Elysia({
  prefix: '/users',
  tags: ['Admin User'],
})
  .use([AdminUserServicePlugin, AdminAuthGuardPlugin])
  .get(
    '/',
    async ({ query, status, adminUserService }) => {
      const pagingQuery = {
        limit: query.limit ?? 10,
        page: query.page ?? 1,
        search: query.search,
        roles: query.roles,
      }

      const result = await adminUserService.getUsers(pagingQuery)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      query: t.Partial(GetUsersQuery),
      response: {
        200: GetUsersResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get list of users',
        description: 'Fetch a list of users',
      },
    }
  )
