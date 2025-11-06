import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia, { t } from 'elysia'

import {
  GetUserByIdParams,
  GetUserByIdResponse,
  GetUsersQuery,
  GetUsersResponse,
  UpdateUserBody,
  UpdateUserParams,
  UpdateUserResponse,
} from './models'
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
  .get(
    '/:userId',
    async ({ params, status, adminUserService }) => {
      const result = await adminUserService.getUserById(params.userId)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: GetUserByIdParams,
      response: {
        200: GetUserByIdResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get user by ID',
        description: 'Fetch a specific user by its ID',
      },
    }
  )
  .patch(
    '/:userId',
    async ({ params, body, status, adminUserService }) => {
      const result = await adminUserService.updateUserById(params.userId, body)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: UpdateUserParams,
      body: UpdateUserBody,
      response: {
        200: UpdateUserResponse,
        ...createErrorSchema(
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update user by ID',
        description: 'Update a specific user by its ID',
      },
    }
  )
