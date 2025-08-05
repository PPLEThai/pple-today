import Elysia from 'elysia'

import {
  CreateFeedCommentBody,
  CreateFeedCommentParams,
  CreateFeedCommentResponse,
  CreateFeedReactionBody,
  CreateFeedReactionParams,
  CreateFeedReactionResponse,
  DeleteFeedCommentParams,
  DeleteFeedCommentResponse,
  DeleteFeedReactionParams,
  DeleteFeedReactionResponse,
  GetFeedCommentParams,
  GetFeedCommentQuery,
  GetFeedCommentResponse,
  UpdateFeedCommentBody,
  UpdateFeedCommentParams,
  UpdateFeedCommentResponse,
} from './models'
import { FeedServicePlugin } from './services'

import { InternalErrorCode } from '../../dtos/error'
import { AuthGuardPlugin } from '../../plugins/auth-guard'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../utils/error'

export const FeedController = new Elysia({
  prefix: '/feeds',
  tags: ['Feeds'],
})
  .use(AuthGuardPlugin)
  .use(FeedServicePlugin)
  .get(
    '/:id/comments',
    async ({ params, query, status, user, feedService }) => {
      const result = await feedService.getFeedComments(params.id, {
        userId: user?.sub,
        limit: query.limit,
        page: query.page,
      })
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.POST_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, result.value as GetFeedCommentResponse)
    },
    {
      fetchUser: true,
      params: GetFeedCommentParams,
      query: GetFeedCommentQuery,
      response: {
        200: GetFeedCommentResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get feed comment by feed ID',
        description: 'Fetch a specific comment from a feed by its ID',
      },
    }
  )
  .post(
    '/:id/reaction',
    async ({ params, body, user, status, feedService }) => {
      const result = await feedService.createFeedReaction(params.id, user.sub, body)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.POST_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.POST_REACTION_ALREADY_EXISTS:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return result.value
    },
    {
      requiredUser: true,
      params: CreateFeedReactionParams,
      body: CreateFeedReactionBody,
      response: {
        201: CreateFeedReactionResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_NOT_FOUND,
          InternalErrorCode.POST_REACTION_ALREADY_EXISTS,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: 'Create post reaction',
        description: 'Add a reaction to a post by its ID',
      },
    }
  )
  .delete(
    '/:id/reaction',
    async ({ params, status, user, feedService }) => {
      const result = await feedService.deleteFeedReaction(params.id, user.sub)

      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.POST_REACTION_NOT_FOUND:
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
      params: DeleteFeedReactionParams,
      response: {
        200: DeleteFeedReactionResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_REACTION_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: 'Delete post reaction',
        description: 'Remove a reaction from a post by its ID',
      },
    }
  )
  .post(
    '/:id/comment',
    async ({ params, body, user, status, feedService }) => {
      const result = await feedService.createFeedComment(params.id, user.sub, body.content)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.POST_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return result.value
    },
    {
      requiredUser: true,
      params: CreateFeedCommentParams,
      body: CreateFeedCommentBody,
      response: {
        201: CreateFeedCommentResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: 'Create post comment',
        description: 'Add a comment to a post by its ID',
      },
    }
  )
  .put(
    '/:id/comment/:commentId',
    async ({ params, body, user, status, feedService }) => {
      const result = await feedService.updateFeedComment(
        params.id,
        params.commentId,
        user.sub,
        body.content
      )

      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.POST_COMMENT_NOT_FOUND:
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
      params: UpdateFeedCommentParams,
      body: UpdateFeedCommentBody,
      response: {
        200: UpdateFeedCommentResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_COMMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: 'Update post comment',
        description: 'Update a comment on a post by its ID',
      },
    }
  )
  .delete(
    '/:id/comment/:commentId',
    async ({ params, user, status, feedService }) => {
      const result = await feedService.deleteFeedComment(params.id, params.commentId, user.sub)

      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.POST_COMMENT_NOT_FOUND:
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
      params: DeleteFeedCommentParams,
      response: {
        200: DeleteFeedCommentResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_COMMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: 'Delete post comment',
        description: 'Remove a comment from a post by its ID',
      },
    }
  )
