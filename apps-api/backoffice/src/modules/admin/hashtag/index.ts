import Elysia from 'elysia'

import {
  CreateHashtagBody,
  CreateHashtagResponse,
  DeleteHashtagParams,
  DeleteHashtagResponse,
  GetHashtagByIdParams,
  GetHashtagByIdResponse,
  GetHashtagsQuery,
  GetHashtagsResponse,
  UpdateHashtagBody,
  UpdateHashtagParams,
  UpdateHashtagResponse,
} from './models'
import { AdminHashtagServicePlugin } from './services'

import { InternalErrorCode } from '../../../dtos/error'
import { AuthGuardPlugin } from '../../../plugins/auth-guard'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../../utils/error'

export const AdminHashtagController = new Elysia({
  prefix: '/hashtags',
  tags: ['Hashtags'],
})
  .use([AuthGuardPlugin, AdminHashtagServicePlugin])
  .get(
    '/',
    async ({ query, status, adminHashtagService }) => {
      const pagingQuery = {
        limit: query.limit ?? 10,
        page: query.page ?? 1,
      }

      const result = await adminHashtagService.getHashtags(pagingQuery)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredUser: true,
      query: GetHashtagsQuery,
      response: {
        200: GetHashtagsResponse,
        ...createErrorSchema(
          InternalErrorCode.HASHTAG_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get all hashtags',
        description: 'Fetch all hashtags',
      },
    }
  )
  .get(
    '/:hashtagId',
    async ({ params, status, adminHashtagService }) => {
      const result = await adminHashtagService.getHashtagById(params.hashtagId)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.HASHTAG_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, result.value)
    },
    {
      requiredUser: true,
      params: GetHashtagByIdParams,
      response: {
        200: GetHashtagByIdResponse,
        ...createErrorSchema(
          InternalErrorCode.HASHTAG_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get hashtag by ID',
        description: 'Fetch a specific hashtag by its ID',
      },
    }
  )
  .post(
    '/',
    async ({ status, body, adminHashtagService }) => {
      const result = await adminHashtagService.createHashtag(body)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.HASHTAG_INVALID_INPUT:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(201, result.value)
    },
    {
      requiredUser: true,
      body: CreateHashtagBody,
      response: {
        201: CreateHashtagResponse,
        ...createErrorSchema(
          InternalErrorCode.HASHTAG_INVALID_INPUT,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Create hashtag',
        description: 'Add hashtag with body',
      },
    }
  )
  .put(
    '/:hashtagId',
    async ({ params, body, status, adminHashtagService }) => {
      const result = await adminHashtagService.updateHashtagById(params.hashtagId, body)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.HASHTAG_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.HASHTAG_INVALID_INPUT:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, result.value)
    },
    {
      requiredUser: true,
      params: UpdateHashtagParams,
      body: UpdateHashtagBody,
      response: {
        200: UpdateHashtagResponse,
        ...createErrorSchema(
          InternalErrorCode.HASHTAG_NOT_FOUND,
          InternalErrorCode.HASHTAG_INVALID_INPUT,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update hashtag by ID',
        description: 'Update a specific hashtag by its ID',
      },
    }
  )
  .delete(
    '/:hashtagId',
    async ({ params, status, adminHashtagService }) => {
      const result = await adminHashtagService.deleteHashtagById(params.hashtagId)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.HASHTAG_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, result.value)
    },
    {
      requiredUser: true,
      params: DeleteHashtagParams,
      response: {
        200: DeleteHashtagResponse,
        ...createErrorSchema(
          InternalErrorCode.HASHTAG_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete hashtag by ID',
        description: 'Remove a specific hashtag by its ID',
      },
    }
  )
