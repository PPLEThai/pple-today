import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  CreateFeedCommentBody,
  CreateFeedCommentParams,
  CreateFeedCommentResponse,
  CreateFeedReactionBody,
  CreateFeedReactionParams,
  CreateFeedReactionResponse,
  DeleteFeedReactionParams,
  DeleteFeedReactionResponse,
  GetFeedCommentParams,
  GetFeedCommentQuery,
  GetFeedCommentResponse,
  GetFeedContentParams,
  GetFeedContentResponse,
  GetFeedItemsByUserIdParams,
  GetFeedItemsByUserIdQuery,
  GetFeedItemsByUserIdResponse,
  GetHashTagFeedQuery,
  GetHashTagFeedResponse,
  GetMyFeedQuery,
  GetMyFeedResponse,
  GetTopicFeedQuery,
  GetTopicFeedResponse,
} from './models'
import { FeedServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'

export const FeedController = new Elysia({
  prefix: '/feed',
  tags: ['Feed'],
})
  .use([AuthGuardPlugin, FeedServicePlugin])
  .get(
    '/me',
    async ({ query, user, feedService, status }) => {
      const feedResult = await feedService.getMyFeed(user?.id, {
        page: query?.page,
        limit: query?.limit,
      })

      if (feedResult.isErr()) {
        return mapErrorCodeToResponse(feedResult.error, status)
      }

      return status(200, feedResult.value)
    },
    {
      fetchLocalUser: true,
      query: GetMyFeedQuery,
      response: {
        200: GetMyFeedResponse,
        ...createErrorSchema(
          InternalErrorCode.FEED_ITEM_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get feed for current user',
        description: 'Fetch feed items for the currently authenticated user',
      },
    }
  )
  .get(
    '/topic',
    async ({ query, user, status, feedService }) => {
      const feedResult = await feedService.getTopicFeed(query.topicId, user?.id, {
        page: query?.page,
        limit: query?.limit,
      })

      if (feedResult.isErr()) {
        return mapErrorCodeToResponse(feedResult.error, status)
      }

      return status(200, feedResult.value)
    },
    {
      fetchLocalUser: true,
      query: GetTopicFeedQuery,
      response: {
        200: GetTopicFeedResponse,
        ...createErrorSchema(
          InternalErrorCode.FEED_ITEM_NOT_FOUND,
          InternalErrorCode.TOPIC_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get feed by topic',
        description: 'Fetch feed items associated with a specific topic',
      },
    }
  )
  .get(
    '/hashtag',
    async ({ query, user, status, feedService }) => {
      const feedResult = await feedService.getHashTagFeed(query.hashTagId, user?.id, {
        page: query.page,
        limit: query.limit,
      })

      if (feedResult.isErr()) {
        return mapErrorCodeToResponse(feedResult.error, status)
      }

      return status(200, feedResult.value)
    },
    {
      fetchLocalUser: true,
      query: GetHashTagFeedQuery,
      response: {
        200: GetHashTagFeedResponse,
        ...createErrorSchema(
          InternalErrorCode.FEED_ITEM_NOT_FOUND,
          InternalErrorCode.TOPIC_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get feed by hashtag',
        description: 'Fetch feed items associated with a specific hashtag',
      },
    }
  )
  .get(
    '/users/:id',
    async ({ feedService, query, params, status }) => {
      const result = await feedService.getFeedByUserId(params.id, {
        page: query?.page,
        limit: query?.limit,
      })

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      fetchLocalUser: true,
      params: GetFeedItemsByUserIdParams,
      query: GetFeedItemsByUserIdQuery,
      response: {
        200: GetFeedItemsByUserIdResponse,
        ...createErrorSchema(
          InternalErrorCode.FEED_ITEM_NOT_FOUND,
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get feed items by user ID',
        description: 'Fetch feed items created by a specific user',
      },
    }
  )
  .get(
    '/:id',
    async ({ params, user, status, feedService }) => {
      const result = await feedService.getFeedContentById(params.id, user?.id)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      fetchLocalUser: true,
      params: GetFeedContentParams,
      response: {
        200: GetFeedContentResponse,
        ...createErrorSchema(
          InternalErrorCode.FEED_ITEM_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get feed item by ID',
        description: 'Fetch a specific feed item by its ID',
      },
    }
  )
  .get(
    '/:id/comments',
    async ({ params, query, status, user, feedService }) => {
      const result = await feedService.getFeedComments(params.id, {
        userId: user?.id,
        limit: query.limit,
        cursor: query.cursor,
      })

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value as GetFeedCommentResponse)
    },
    {
      fetchLocalUser: true,
      params: GetFeedCommentParams,
      query: GetFeedCommentQuery,
      response: {
        200: GetFeedCommentResponse,
        ...createErrorSchema(
          InternalErrorCode.FEED_ITEM_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get feed comment by feed ID',
        description: 'Fetch a specific comment from a feed by its ID',
      },
    }
  )
  .put(
    '/:id/reaction',
    async ({ params, body, user, status, feedService }) => {
      const result = await feedService.upsertFeedReaction(params.id, user.id, body)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return result.value
    },
    {
      requiredLocalUser: true,
      params: CreateFeedReactionParams,
      body: CreateFeedReactionBody,
      response: {
        201: CreateFeedReactionResponse,
        ...createErrorSchema(
          InternalErrorCode.FEED_ITEM_NOT_FOUND,
          InternalErrorCode.FEED_ITEM_REACTION_ALREADY_EXISTS,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update feed reaction',
        description: 'Update a reaction in feed item by its ID',
      },
    }
  )
  .delete(
    '/:id/reaction',
    async ({ params, status, user, feedService }) => {
      const result = await feedService.deleteFeedReaction(params.id, user.id)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: DeleteFeedReactionParams,
      response: {
        200: DeleteFeedReactionResponse,
        ...createErrorSchema(
          InternalErrorCode.FEED_ITEM_REACTION_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete feed reaction',
        description: 'Remove a reaction from a feed item by its ID',
      },
    }
  )
  .post(
    '/:id/comment',
    async ({ params, body, user, status, feedService }) => {
      const result = await feedService.createFeedComment(params.id, user.id, body.content)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return result.value
    },
    {
      requiredLocalUser: true,
      params: CreateFeedCommentParams,
      body: CreateFeedCommentBody,
      response: {
        201: CreateFeedCommentResponse,
        ...createErrorSchema(
          InternalErrorCode.FEED_ITEM_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Create feed comment',
        description: 'Add a comment to a feed item by its ID',
      },
    }
  )
// .put(
//   '/:id/comment/:commentId',
//   async ({ params, body, user, status, feedService }) => {
//     const result = await feedService.updateFeedComment(
//       params.id,
//       params.commentId,
//       user.id,
//       body.content
//     )

//     if (result.isErr()) {
//       return mapErrorCodeToResponse(result.error, status)
//     }

//     return status(200, result.value)
//   },
//   {
//     requiredLocalUser: true,
//     params: UpdateFeedCommentParams,
//     body: UpdateFeedCommentBody,
//     response: {
//       200: UpdateFeedCommentResponse,
//       ...createErrorSchema(
//         InternalErrorCode.FEED_ITEM_COMMENT_NOT_FOUND,
//         InternalErrorCode.INTERNAL_SERVER_ERROR
//       ),
//     },
//     detail: {
//       summary: 'Update feed comment',
//       description: 'Update a comment on a feed item by its ID',
//     },
//   }
// )
// .delete(
//   '/:id/comment/:commentId',
//   async ({ params, user, status, feedService }) => {
//     const result = await feedService.deleteFeedComment(params.id, params.commentId, user.id)

//     if (result.isErr()) {
//       return mapErrorCodeToResponse(result.error, status)
//     }

//     return status(200, result.value)
//   },
//   {
//     requiredLocalUser: true,
//     params: DeleteFeedCommentParams,
//     response: {
//       200: DeleteFeedCommentResponse,
//       ...createErrorSchema(
//         InternalErrorCode.FEED_ITEM_COMMENT_NOT_FOUND,
//         InternalErrorCode.INTERNAL_SERVER_ERROR
//       ),
//     },
//     detail: {
//       summary: 'Delete feed comment',
//       description: 'Remove a comment from a feed item by its ID',
//     },
//   }
// )
