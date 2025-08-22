import Elysia from 'elysia'

import { GetTopicsResponse } from './models'
import { TopicServicePlugin } from './service'

import { InternalErrorCode } from '../../dtos/error'
import { createErrorSchema, mapErrorCodeToResponse } from '../../utils/error'

export const TopicController = new Elysia({
  prefix: '/topics',
  tags: ['Topics'],
})
  .use([TopicServicePlugin])
  .get(
    '/',
    async ({ topicService, status }) => {
      const topics = await topicService.GetTopics()

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
  .get('/follows', () => {})
  .post('/:id/follow', () => {})
  .delete('/:id/follow', () => {})
