import node from '@elysiajs/node'
import Elysia from 'elysia'
import { match } from 'ts-pattern'

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
import PostService from './services'

import { InternalErrorCode } from '../../dtos/error'
import { AuthPlugin } from '../../plugins/auth'
import { createErrorSchema, mapErrorCodeToResponse } from '../../utils/error'

export const postsController = new Elysia({
  prefix: '/posts',
  adapter: node(),
})
  .use([AuthPlugin, PostService])
  .get(
    '/:id',
    async ({ params, status, oidcUser, postService }) => {
      const result = await postService.getPostById(params.id, oidcUser.sub) // Replace 'user-id-placeholder' with actual user ID logic
      if (result.isErr()) {
        return match(result.error)
          .with({ code: InternalErrorCode.POST_NOT_FOUND }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .exhaustive()
      }

      return status(200, result.value)
    },
    {
      getOIDCUser: true,
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
    async ({ params, query, status, oidcUser, postService }) => {
      const result = await postService.getPostComments(params.id, {
        userId: oidcUser.sub,
        limit: query.limit,
        page: query.page,
      })
      if (result.isErr()) {
        return match(result.error)
          .with({ code: InternalErrorCode.POST_NOT_FOUND }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .exhaustive()
      }

      return status(200, result.value as GetPostCommentResponse)
    },
    {
      getOIDCUser: true,
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
    async ({ params, body, oidcUser, status, postService }) => {
      const result = await postService.createPostReaction(params.id, oidcUser.sub, body)
      if (result.isErr()) {
        return match(result.error)
          .with({ code: InternalErrorCode.POST_NOT_FOUND }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.POST_REACTION_ALREADY_EXISTS }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .exhaustive()
      }

      return result.value
    },
    {
      getOIDCUser: true,
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
    async ({ params, status, oidcUser, postService }) => {
      const result = await postService.deletePostReaction(params.id, oidcUser.sub)

      if (result.isErr()) {
        return match(result.error)
          .with({ code: InternalErrorCode.POST_REACTION_NOT_FOUND }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .exhaustive()
      }

      return status(200, result.value)
    },
    {
      getOIDCUser: true,
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
    async ({ params, body, oidcUser, status, postService }) => {
      const result = await postService.createPostComment(params.id, oidcUser.sub, body.content)
      if (result.isErr()) {
        return match(result.error)
          .with({ code: InternalErrorCode.POST_NOT_FOUND }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .exhaustive()
      }

      return result.value
    },
    {
      getOIDCUser: true,
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
    async ({ params, body, oidcUser, status, postService }) => {
      const result = await postService.updatePostComment(
        params.id,
        params.commentId,
        oidcUser.sub,
        body.content
      )

      if (result.isErr()) {
        return match(result.error)
          .with({ code: InternalErrorCode.POST_COMMENT_NOT_FOUND }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .exhaustive()
      }

      return status(200, result.value)
    },
    {
      getOIDCUser: true,
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
    async ({ params, oidcUser, status, postService }) => {
      const result = await postService.deletePostComment(params.id, params.commentId, oidcUser.sub)

      if (result.isErr()) {
        return match(result.error)
          .with({ code: InternalErrorCode.POST_COMMENT_NOT_FOUND }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .with({ code: InternalErrorCode.INTERNAL_SERVER_ERROR }, (e) =>
            mapErrorCodeToResponse(e, status)
          )
          .exhaustive()
      }

      return status(200, result.value)
    },
    {
      getOIDCUser: true,
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
