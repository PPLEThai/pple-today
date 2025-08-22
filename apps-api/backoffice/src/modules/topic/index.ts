import Elysia from 'elysia'

import { GetTopicsResponse } from './models'
import { TopicServicePlugin } from './service'

import { InternalErrorCode } from '../../dtos/error'
import { AuthGuardPlugin } from '../../plugins/auth-guard'
import { createErrorSchema, mapErrorCodeToResponse } from '../../utils/error'

export const TopicController = new Elysia({
  prefix: '/topics',
  tags: ['Topics'],
})
  .use(TopicServicePlugin)
  .use(AuthGuardPlugin)
  .get(
    '/',
    async ({ topicService, status }) => {
      const topics = await topicService.getTopics()

      if (topics.isErr()) {
        return mapErrorCodeToResponse(topics.error, status)
      }

      return status(200, topics.value)
    },
    {
      response: {
        200: GetTopicsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get all topics',
        description: 'Get all topics entries',
      },
    }
  )
  .get(
    '/follows',
    async ({ user, status, topicService }) => {
      const topics = await topicService.getFollowedTopics(user.id)

      if (topics.isErr()) {
        return mapErrorCodeToResponse(topics.error, status)
      }

      return status(200, topics.value)
    },
    {
      requiredLocalUser: true,
      response: {
        200: GetTopicsResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.UNAUTHORIZED
        ),
      },
      detail: {
        summary: 'Get followed topics',
        description: 'Get followed topics',
      },
    }
  )
  .post('/:id/follow', () => {})
  .delete('/:id/follow', () => {})
