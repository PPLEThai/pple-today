import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  CreateTopicResponse,
  DeleteTopicParams,
  DeleteTopicResponse,
  GetTopicByIdParams,
  GetTopicByIdResponse,
  GetTopicsQuery,
  GetTopicsResponse,
  UpdateTopicBody,
  UpdateTopicParams,
  UpdateTopicResponse,
} from './models'
import { AdminTopicServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminTopicController = new Elysia({
  prefix: '/topics',
  tags: ['Admin Topics'],
})
  .use([AdminAuthGuardPlugin, AdminTopicServicePlugin])
  .get(
    '/',
    async ({ query, status, adminTopicService }) => {
      const pagingQuery = {
        limit: query.limit ?? 10,
        page: query.page ?? 1,
      }

      const result = await adminTopicService.getTopics(pagingQuery)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      query: GetTopicsQuery,
      response: {
        200: GetTopicsResponse,
        ...createErrorSchema(
          InternalErrorCode.TOPIC_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get all topics',
        description: 'Fetch all topics',
      },
    }
  )
  .get(
    '/:topicId',
    async ({ params, status, adminTopicService }) => {
      const result = await adminTopicService.getTopicById(params.topicId)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: GetTopicByIdParams,
      response: {
        200: GetTopicByIdResponse,
        ...createErrorSchema(
          InternalErrorCode.TOPIC_NOT_FOUND,
          InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get topic by ID',
        description: 'Fetch a specific topic by its ID',
      },
    }
  )
  .post(
    '/',
    async ({ status, adminTopicService }) => {
      const result = await adminTopicService.createEmptyTopic()
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(201, result.value)
    },
    {
      requiredLocalUser: true,
      response: {
        201: CreateTopicResponse,
        ...createErrorSchema(
          InternalErrorCode.TOPIC_INVALID_INPUT,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Create topic',
        description: 'Add topic with body',
      },
    }
  )
  .put(
    '/:topicId',
    async ({ params, body, status, adminTopicService }) => {
      const result = await adminTopicService.updateTopicById(params.topicId, body)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: UpdateTopicParams,
      body: UpdateTopicBody,
      response: {
        200: UpdateTopicResponse,
        ...createErrorSchema(
          InternalErrorCode.TOPIC_NOT_FOUND,
          InternalErrorCode.TOPIC_INVALID_INPUT,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update topic by ID',
        description: 'Update a specific topic by its ID',
      },
    }
  )
  .delete(
    '/:topicId',
    async ({ params, status, adminTopicService }) => {
      const result = await adminTopicService.deleteTopicById(params.topicId)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: DeleteTopicParams,
      response: {
        200: DeleteTopicResponse,
        ...createErrorSchema(
          InternalErrorCode.TOPIC_NOT_FOUND,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete topic by ID',
        description: 'Remove a specific topic by its ID',
      },
    }
  )
