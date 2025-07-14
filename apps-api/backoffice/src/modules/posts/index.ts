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
import PostService from './services'

import { InternalErrorCode } from '../../dtos/error'
import { createErrorSchema } from '../../utils/error'

// TODO: Replace with actual user ID logic and user guarding
// This is a placeholder for demonstration purposes.
const userId = 'user-id-placeholder'

export const postsController = new Elysia({
  prefix: '/posts',
  adapter: node(),
})
  .get(
    '/:id',
    async ({ params, status }) => {
      const result = await PostService.getPostById(params.id, userId) // Replace 'user-id-placeholder' with actual user ID logic
      if (result.isErr()) {
        // TODO: Implement proper response and error mapping
        return status(404, {
          error: {
            code: InternalErrorCode.POST_NOT_FOUND,
            message: 'Post not found',
            data: {
              helloWorld: 'Post not found',
            },
          },
        })
      }

      return status(200, result.value)
    },
    {
      params: GetPostByIdParams,
      response: {
        200: GetPostByIdResponse,
        ...createErrorSchema(InternalErrorCode.POST_NOT_FOUND),
      },
    }
  )
  .get(
    '/:id/comments',
    async ({ params, query, status }) => {
      const result = await PostService.getPostComments(params.id, {
        userId,
        limit: query.limit,
        page: query.page,
      })
      if (result.isErr()) {
        return status(404, {
          error: {
            code: InternalErrorCode.POST_NOT_FOUND,
            message: 'Post not found',
            data: {
              helloWorld: 'Post not found',
            },
          },
        })
      }

      return status(200, result.value as GetPostCommentResponse)
    },
    {
      params: GetPostCommentParams,
      query: GetPostCommentQuery,
      response: {
        200: GetPostCommentResponse,
        ...createErrorSchema(InternalErrorCode.POST_NOT_FOUND),
      },
    }
  )
  .post(
    '/:id/reaction',
    async ({ params, body, status }) => {
      const result = await PostService.createPostReaction(params.id, userId, body)
      if (result.isErr()) {
        return status(409, {
          error: {
            code: InternalErrorCode.POST_REACTION_ALREADY_EXISTS,
            message: 'Reaction already exists for this post.',
          },
        })
      }

      return result.value
    },
    {
      params: CreatePostReactionParams,
      body: CreatePostReactionBody,
      response: {
        201: CreatePostReactionResponse,
        ...createErrorSchema(InternalErrorCode.POST_REACTION_ALREADY_EXISTS),
      },
    }
  )
  .delete(
    '/:id/reaction',
    async ({ params, status }) => {
      const result = await PostService.deletePostReaction(params.id, userId)

      if (result.isErr()) {
        return status(404, {
          error: {
            code: InternalErrorCode.POST_REACTION_NOT_FOUND,
            message: 'Reaction not found',
          },
        })
      }

      return status(200, result.value)
    },
    {
      params: DeletePostReactionParams,
      response: {
        200: DeletePostReactionResponse,
        ...createErrorSchema(InternalErrorCode.POST_REACTION_NOT_FOUND),
      },
    }
  )
  .post(
    '/:id/comment',
    async ({ params, body, status }) => {
      const result = await PostService.createPostComment(params.id, userId, body.content)
      if (result.isErr()) {
        return status(404, {
          error: {
            code: 'POST_NOT_FOUND',
            message: 'Post comment not found',
          },
        })
      }

      return result.value
    },
    {
      params: CreatePostCommentParams,
      body: CreatePostCommentBody,
      response: {
        201: CreatePostCommentResponse,
        ...createErrorSchema(InternalErrorCode.POST_NOT_FOUND, InternalErrorCode.FORBIDDEN),
      },
    }
  )
  .put(
    '/:id/comment/:commentId',
    async ({ params, body, status }) => {
      const result = await PostService.updatePostComment(
        params.id,
        params.commentId,
        userId,
        body.content
      )

      if (result.isErr()) {
        return status(403, {
          error: {
            code: InternalErrorCode.FORBIDDEN,
            message: 'You do not have permission to update this comment.',
          },
        })
      }

      return status(200, result.value)
    },
    {
      params: UpdatePostCommentParams,
      body: UpdatePostCommentBody,
      response: {
        200: UpdatePostCommentResponse,
        ...createErrorSchema(InternalErrorCode.POST_COMMENT_NOT_FOUND, InternalErrorCode.FORBIDDEN),
      },
    }
  )
  .delete(
    '/:id/comment/:commentId',
    async ({ params, status }) => {
      const result = await PostService.deletePostComment(params.id, params.commentId, userId)

      if (result.isErr()) {
        return status(403, {
          error: {
            code: InternalErrorCode.FORBIDDEN,
            message: 'You do not have permission to delete this comment.',
          },
        })
      }

      return status(200, result.value)
    },
    {
      params: DeletePostCommentParams,
      response: {
        200: DeletePostCommentResponse,
        ...createErrorSchema(InternalErrorCode.POST_COMMENT_NOT_FOUND, InternalErrorCode.FORBIDDEN),
      },
    }
  )
