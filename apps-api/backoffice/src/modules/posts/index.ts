import node from '@elysiajs/node'
import Elysia from 'elysia'

import {
  CreatePostCommentBody,
  CreatePostCommentParams,
  CreatePostCommentResponse,
  CreatePostReactionBody,
  CreatePostReactionParams,
  CreatePostReactionResponse,
  DeletePostCommentParams,
  DeletePostCommentResponse,
  DeletePostReactionParams,
  DeletePostReactionResponse,
  GetPostByIdParams,
  GetPostByIdResponse,
  GetPostCommentParams,
  GetPostCommentQuery,
  GetPostCommentResponse,
  UpdatePostCommentBody,
  UpdatePostCommentParams,
  UpdatePostCommentResponse,
} from './models'
import { PostServicePlugin } from './services'

import { InternalErrorCode } from '../../dtos/error'
import { AuthGuardPlugin } from '../../plugins/auth-guard'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../utils/error'

export const PostsController = new Elysia({
  prefix: '/posts',
  adapter: node(),
})
  .use([AuthGuardPlugin, PostServicePlugin])
  .get(
    '/:id',
    async ({ params, status, user, postService }) => {
      const result = await postService.getPostById(params.id, user?.sub)

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

      return status(200, result.value)
    },
    {
      fetchUser: true,
      params: GetPostByIdParams,
      response: {
        200: GetPostByIdResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .get(
    '/:id/comments',
    async ({ params, query, status, user, postService }) => {
      const result = await postService.getPostComments(params.id, {
        userId: user.sub,
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

      return status(200, result.value as GetPostCommentResponse)
    },
    {
      requiredUser: true,
      params: GetPostCommentParams,
      query: GetPostCommentQuery,
      response: {
        200: GetPostCommentResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .post(
    '/:id/reaction',
    async ({ params, body, user, status, postService }) => {
      const result = await postService.createPostReaction(params.id, user.sub, body)
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
      params: CreatePostReactionParams,
      body: CreatePostReactionBody,
      response: {
        201: CreatePostReactionResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_NOT_FOUND,
          InternalErrorCode.POST_REACTION_ALREADY_EXISTS,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .delete(
    '/:id/reaction',
    async ({ params, status, user, postService }) => {
      const result = await postService.deletePostReaction(params.id, user.sub)

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
      params: DeletePostReactionParams,
      response: {
        200: DeletePostReactionResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_REACTION_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .post(
    '/:id/comment',
    async ({ params, body, user, status, postService }) => {
      const result = await postService.createPostComment(params.id, user.sub, body.content)
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
      params: CreatePostCommentParams,
      body: CreatePostCommentBody,
      response: {
        201: CreatePostCommentResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .put(
    '/:id/comment/:commentId',
    async ({ params, body, user, status, postService }) => {
      const result = await postService.updatePostComment(
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
      params: UpdatePostCommentParams,
      body: UpdatePostCommentBody,
      response: {
        200: UpdatePostCommentResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_COMMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .delete(
    '/:id/comment/:commentId',
    async ({ params, user, status, postService }) => {
      const result = await postService.deletePostComment(params.id, params.commentId, user.sub)

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
      params: DeletePostCommentParams,
      response: {
        200: DeletePostCommentResponse,
        ...createErrorSchema(
          InternalErrorCode.POST_COMMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
