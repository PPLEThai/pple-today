import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia, { t } from 'elysia'

import {
  DeletePostParams,
  DeletePostResponse,
  GetPostsQuery,
  GetPostsResponse,
  UpdatePostBody,
  UpdatePostParams,
  UpdatePostResponse,
} from './models'
import { AdminPostServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminPostController = new Elysia({
  prefix: '/posts',
  tags: ['Admin Post'],
})
  .use([AdminPostServicePlugin, AdminAuthGuardPlugin])
  .get(
    '/',
    async ({ query, status, adminPostService }) => {
      const pagingQuery = {
        limit: query.limit ?? 10,
        page: query.page ?? 1,
        status: query.status,
        search: query.search,
      }

      const result = await adminPostService.getPosts(pagingQuery)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      query: t.Partial(GetPostsQuery),
      response: {
        200: GetPostsResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get list of posts',
        description: 'Fetch a list of posts',
      },
    }
  )
  .patch(
    '/:postId',
    async ({ params, body, status, adminPostService }) => {
      const result = await adminPostService.updatePostById(params.postId, body)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: UpdatePostParams,
      body: UpdatePostBody,
      response: {
        200: UpdatePostResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update post by ID',
        description: 'Update a specific post by its ID',
      },
    }
  )
  .delete(
    '/:postId',
    async ({ params, status, adminPostService }) => {
      const result = await adminPostService.deletePostById(params.postId)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: DeletePostParams,
      response: {
        200: DeletePostResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete post by ID',
        description: 'Remove a specific post by its ID',
      },
    }
  )
