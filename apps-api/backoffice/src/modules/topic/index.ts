import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  FollowTopicParams,
  FollowTopicResponse,
  GetTopicParams,
  GetTopicRecommendationResponse,
  GetTopicResponse,
  GetTopicsResponse,
  ListTopicResponse,
  UnFollowTopicParams,
} from './models'
import { TopicServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'
import { UnfollowUserResponse } from '../profile/models'

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
    '/:id',
    async ({ topicService, status, params }) => {
      const topic = await topicService.getTopicById(params.id)

      if (topic.isErr()) {
        return mapErrorCodeToResponse(topic.error, status)
      }

      return status(200, topic.value)
    },
    {
      params: GetTopicParams,
      response: {
        200: GetTopicResponse,
        ...createErrorSchema(InternalErrorCode.TOPIC_NOT_FOUND),
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get topic by id',
        description: 'Get topic details by id',
      },
    }
  )
  .get(
    '/recommend',
    async ({ user, topicService, status }) => {
      const result = await topicService.getTopicRecommendation(user.id)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      response: {
        200: GetTopicRecommendationResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get recommended topics',
        description: "Fetch the authenticated user's recommended topics",
      },
    }
  )
  .get(
    '/list',
    async ({ user, topicService, status }) => {
      const topics = await topicService.listTopic(user.id)
      if (topics.isErr()) {
        return mapErrorCodeToResponse(topics.error, status)
      }
      return status(200, topics.value)
    },
    {
      requiredLocalUser: true,
      response: {
        200: ListTopicResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.UNAUTHORIZED
        ),
      },
      detail: {
        summary: 'List topics with followed status',
        description: 'List topics with followed status',
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
  .post(
    '/:topicId/follow',
    async ({ params, user, topicService, status }) => {
      const topicId = params.topicId
      const userId = user.id
      const result = await topicService.followTopic(topicId, userId)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, {
        message: 'Successfully follows topic',
      })
    },
    {
      requiredLocalUserPrecondition: {
        isActive: true,
      },
      params: FollowTopicParams,
      response: {
        200: FollowTopicResponse,
        ...createErrorSchema(
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.TOPIC_NOT_FOUND,
          InternalErrorCode.TOPIC_CANNOT_FOLLOW_SUSPENDED,
          InternalErrorCode.TOPIC_ALREADY_FOLLOWED
        ),
      },
      detail: {
        summary: 'Follow topic',
        description: 'Follow topic',
      },
    }
  )
  .delete(
    '/:topicId/follow',
    async ({ params, user, topicService, status }) => {
      const topicId = params.topicId
      const userId = user.id

      const result = await topicService.unFollowTopic(topicId, userId)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, {
        message: 'Successfully unfollows topic',
      })
    },
    {
      requiredLocalUserPrecondition: {
        isActive: true,
      },
      params: UnFollowTopicParams,
      response: {
        200: UnfollowUserResponse,
        ...createErrorSchema(
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.TOPIC_NOT_FOUND,
          InternalErrorCode.TOPIC_NOT_FOLLOWED
        ),
      },
      detail: {
        summary: 'Unfollow topic',
        description: 'Unfollow topic',
      },
    }
  )
