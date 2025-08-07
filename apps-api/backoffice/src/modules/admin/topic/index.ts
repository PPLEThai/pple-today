import Elysia from 'elysia'

import {
  CreateTopicBody,
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

import { InternalErrorCode } from '../../../dtos/error'
import { AuthGuardPlugin } from '../../../plugins/auth-guard'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../../utils/error'

export const AdminTopicController = new Elysia({
  prefix: '/topics',
  tags: ['Topics'],
})
  .use([AuthGuardPlugin, AdminTopicServicePlugin])
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
      requiredUser: true,
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
        switch (result.error.code) {
          case InternalErrorCode.TOPIC_NOT_FOUND:
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
      params: GetTopicByIdParams,
      response: {
        200: GetTopicByIdResponse,
        ...createErrorSchema(
          InternalErrorCode.TOPIC_NOT_FOUND,
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
    async ({ status, body, adminTopicService }) => {
      const result = await adminTopicService.createTopic(body)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.TOPIC_INVALID_INPUT:
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
      body: CreateTopicBody,
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
        switch (result.error.code) {
          case InternalErrorCode.TOPIC_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.TOPIC_INVALID_INPUT:
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
      params: UpdateTopicParams,
      body: UpdateTopicBody,
      response: {
        200: UpdateTopicResponse,
        ...createErrorSchema(
          InternalErrorCode.TOPIC_NOT_FOUND,
          InternalErrorCode.TOPIC_INVALID_INPUT,
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
        switch (result.error.code) {
          case InternalErrorCode.TOPIC_NOT_FOUND:
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
      params: DeleteTopicParams,
      response: {
        200: DeleteTopicResponse,
        ...createErrorSchema(
          InternalErrorCode.TOPIC_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete topic by ID',
        description: 'Remove a specific topic by its ID',
      },
    }
  )
