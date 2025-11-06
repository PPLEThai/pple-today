import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia, { t } from 'elysia'

import {
  GetFacebookPageByIdParams,
  GetFacebookPageByIdResponse,
  GetFacebookPagesQuery,
  GetFacebookPagesResponse,
  UpdateFacebookPageBody,
  UpdateFacebookPageParams,
  UpdateFacebookPageResponse,
} from './models'
import { AdminFacebookPageServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminFacebookPageController = new Elysia({
  prefix: '/facebook',
  tags: ['Admin Facebook'],
})
  .use([AdminFacebookPageServicePlugin, AdminAuthGuardPlugin])
  .get(
    '/',
    async ({ query, status, adminFacebookPageService }) => {
      const pagingQuery = {
        limit: query.limit ?? 10,
        page: query.page ?? 1,
        status: query.status,
        search: query.search,
      }

      const result = await adminFacebookPageService.getFacebookPages(pagingQuery)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      query: t.Partial(GetFacebookPagesQuery),
      response: {
        200: GetFacebookPagesResponse,
        ...createErrorSchema(
          InternalErrorCode.FACEBOOK_PAGE_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get list of facebook page',
        description: 'Fetch a list of facebook page',
      },
    }
  )
  .get(
    '/:facebookPageId',
    async ({ params, status, adminFacebookPageService }) => {
      const result = await adminFacebookPageService.getFacebookPageById(params.facebookPageId)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: GetFacebookPageByIdParams,
      response: {
        200: GetFacebookPageByIdResponse,
        ...createErrorSchema(
          InternalErrorCode.FACEBOOK_PAGE_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get facebook page by ID',
        description: 'Fetch a specific facebook page by its ID',
      },
    }
  )
  .patch(
    '/:facebookPageId',
    async ({ params, body, status, adminFacebookPageService }) => {
      const result = await adminFacebookPageService.updateFacebookPageById(
        params.facebookPageId,
        body
      )
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: UpdateFacebookPageParams,
      body: UpdateFacebookPageBody,
      response: {
        200: UpdateFacebookPageResponse,
        ...createErrorSchema(
          InternalErrorCode.FACEBOOK_PAGE_NOT_FOUND,
          InternalErrorCode.FACEBOOK_PAGE_AUTHOR_NOT_FOUND,
          InternalErrorCode.FACEBOOK_API_ERROR,
          InternalErrorCode.FACEBOOK_INVALID_RESPONSE,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update facebook page by ID',
        description: 'Update a specific facebook page by its ID',
      },
    }
  )
