import Elysia from 'elysia'
import { TopicServicePlugin } from './service'
import { GetTopicsResponse } from './models'
import { createErrorSchema, mapErrorCodeToResponse } from '../../utils/error'
import { InternalErrorCode } from '../../dtos/error'

export const TopicController = new Elysia({
  prefix: '/topics',
  tags: ['Topic'],
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
    }
  )
  .get('/follows', () => {})
  .post('/:id/follow', () => {})
  .delete('/:id/follow', () => {})
