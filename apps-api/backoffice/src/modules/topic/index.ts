import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  FollowTopicParams,
  FollowTopicResponse,
  GetHashtagResponse,
  GetTopicsResponse,
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
      requiredLocalUser: true,
      params: FollowTopicParams,
      response: {
        200: FollowTopicResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.TOPIC_NOT_FOUND,
          InternalErrorCode.TOPIC_CANNOT_FOLLOW_DRAFT,
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
      requiredLocalUser: true,
      params: UnFollowTopicParams,
      response: {
        200: UnfollowUserResponse,
        ...createErrorSchema(
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
  .get(
    '/hashtag/:id',
    async ({ params, status, topicService }) => {
      const hashtagId = params.id
      const hashtag = await topicService.getHashtagById(hashtagId)
      if (hashtag.isErr()) {
        return mapErrorCodeToResponse(hashtag.error, status)
      }

      return status(200, hashtag.value)
    },
    {
      response: {
        200: GetHashtagResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.HASHTAG_NOT_FOUND,
          InternalErrorCode.UNAUTHORIZED
        ),
      },
      detail: {
        summary: 'Get hashtag detail',
        description: 'Get hashtag detail',
      },
    }
  )
