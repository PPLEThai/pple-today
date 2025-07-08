import node from '@elysiajs/node'
import Elysia, { t } from 'elysia'

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

// TODO: Replace with actual user ID logic and user guarding
// This is a placeholder for demonstration purposes.
const userId = 'user-id-placeholder'

export const postController = new Elysia({
  prefix: '/post',
  adapter: node(),
})
  .get(
    '/:id',
    async ({ params, status }) => {
      const result = await PostService.getPostById(params.id, userId) // Replace 'user-id-placeholder' with actual user ID logic
      if (result.isErr()) {
        return status(404, {
          x: 'Post not found',
        })
      }

      return status(200, result.value)
    },
    {
      params: GetPostByIdParams,
      response: {
        200: GetPostByIdResponse,
        404: t.Object({
          x: t.String({ description: 'Post not found' }),
        }),
      },
    }
  )
  .get(
    '/:id/comments',
    async ({ params, query }) => {
      const result = await PostService.getPostComments(params.id, {
        userId,
        limit: query.limit,
        page: query.page,
      })
      if (result.isErr()) {
        return {
          status: 404,
          body: { x: 'Post not found' },
        } as any
      }

      return result.value
    },
    {
      params: GetPostCommentParams,
      query: GetPostCommentQuery,
      response: GetPostCommentResponse,
    }
  )
  .post(
    '/:id/reaction',
    async ({ params, body }) => {
      const result = await PostService.createPostReaction(params.id, userId, body)
      if (result.isErr()) {
        return {
          status: 404,
          body: { x: 'Post not found' },
        } as any
      }

      return result.value
    },
    {
      params: CreatePostReactionParams,
      body: CreatePostReactionBody,
      response: {
        201: CreatePostReactionResponse,
      },
    }
  )
  .delete(
    '/:id/reaction',
    async ({ params }) => {
      const result = await PostService.deletePostReaction(params.id, userId)
      if (result.isErr()) {
        return {
          status: 404,
          body: { x: 'Post not found' },
        } as any
      }

      return result.value
    },
    {
      params: DeletePostReactionParams,
      response: DeletePostReactionResponse,
    }
  )
  .post(
    '/:id/comment',
    async ({ params, body }) => {
      const result = await PostService.createPostComment(params.id, userId, body.content)
      if (result.isErr()) {
        return {
          status: 404,
          body: { x: 'Post not found' },
        } as any
      }

      return result.value
    },
    {
      params: CreatePostCommentParams,
      body: CreatePostCommentBody,
      response: CreatePostCommentResponse,
    }
  )
  .put(
    '/:id/comment/:commentId',
    async ({ params, body }) => {
      const result = await PostService.updatePostComment(
        params.id,
        params.commentId,
        userId,
        body.content
      )

      if (result.isErr()) {
        return {
          status: 404,
          body: { x: 'Comment not found' },
        } as any
      }

      return result.value
    },
    {
      params: UpdatePostCommentParams,
      body: UpdatePostCommentBody,
      response: {
        200: UpdatePostCommentResponse,
        404: t.Object({
          x: t.String({ description: 'Comment not found' }),
        }),
      },
    }
  )
  .delete(
    '/:id/comment/:commentId',
    async ({ params }) => {
      const result = await PostService.deletePostComment(params.id, params.commentId, userId)

      if (result.isErr()) {
        return {
          status: 404,
          body: { x: 'Comment not found' },
        } as any
      }

      return result.value
    },
    {
      params: DeletePostCommentParams,
      response: DeletePostCommentResponse,
    }
  )
  .listen(3000)
