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
import { authPlugin } from '../../plugins/auth'
import { createErrorSchema } from '../../utils/error'

export const postsController = new Elysia({
  prefix: '/posts',
  adapter: node(),
})
  .use(authPlugin)
  .get(
    '/:id',
    async ({ params, status, oidcUser }) => {
      const result = await PostService.getPostById(params.id, oidcUser.sub) // Replace 'user-id-placeholder' with actual user ID logic
      if (result.isErr()) {
        return match(result.error)
          .with(
            {
              code: 'RECORD_NOT_FOUND',
            },
            () =>
              status(404, {
                error: {
                  code: InternalErrorCode.POST_NOT_FOUND,
                  message: 'Post not found',
                },
              })
          )
          .otherwise(() =>
            status(500, {
              error: {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
              },
            })
          )
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
    async ({ params, query, status, oidcUser }) => {
      const result = await PostService.getPostComments(params.id, {
        userId: oidcUser.sub,
        limit: query.limit,
        page: query.page,
      })
      if (result.isErr()) {
        return match(result.error)
          .with(
            {
              code: 'RECORD_NOT_FOUND',
            },
            () =>
              status(404, {
                error: {
                  code: InternalErrorCode.POST_NOT_FOUND,
                  message: 'Post not found',
                  data: {
                    helloWorld: 'Post not found',
                  },
                },
              })
          )
          .otherwise(() => {
            // Handle other errors
            return status(500, {
              error: {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
              },
            })
          })
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
    async ({ params, body, oidcUser, status }) => {
      const result = await PostService.createPostReaction(params.id, oidcUser.sub, body)
      if (result.isErr()) {
        return match(result.error)
          .with(
            {
              code: 'UNIQUE_CONSTRAINT_FAILED',
            },
            () =>
              status(409, {
                error: {
                  code: InternalErrorCode.POST_REACTION_ALREADY_EXISTS,
                  message: 'Reaction already exists',
                },
              })
          )
          .otherwise(() => {
            // Handle other errors
            return status(500, {
              error: {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
              },
            })
          })
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
          InternalErrorCode.POST_REACTION_ALREADY_EXISTS,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .delete(
    '/:id/reaction',
    async ({ params, status, oidcUser }) => {
      const result = await PostService.deletePostReaction(params.id, oidcUser.sub)

      if (result.isErr()) {
        return match(result.error)
          .with(
            {
              code: 'RECORD_NOT_FOUND',
            },
            () =>
              status(404, {
                error: {
                  code: InternalErrorCode.POST_REACTION_NOT_FOUND,
                  message: 'Reaction not found',
                },
              })
          )
          .otherwise(() => {
            return status(500, {
              error: {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
              },
            })
          })
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
    async ({ params, body, oidcUser, status }) => {
      const result = await PostService.createPostComment(params.id, oidcUser.sub, body.content)
      if (result.isErr()) {
        return match(result.error)
          .with(
            {
              code: 'RECORD_NOT_FOUND',
            },
            () =>
              status(404, {
                error: {
                  code: InternalErrorCode.POST_NOT_FOUND,
                  message: 'Post not found',
                },
              })
          )
          .otherwise(() => {
            return status(500, {
              error: {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
              },
            })
          })
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
    async ({ params, body, oidcUser, status }) => {
      const result = await PostService.updatePostComment(
        params.id,
        params.commentId,
        oidcUser.sub,
        body.content
      )

      if (result.isErr()) {
        return match(result.error)
          .with(
            {
              code: 'RECORD_NOT_FOUND',
            },
            () =>
              status(404, {
                error: {
                  code: InternalErrorCode.POST_COMMENT_NOT_FOUND,
                  message: 'Post comment not found',
                },
              })
          )
          .otherwise(() => {
            return status(500, {
              error: {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
              },
            })
          })
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
    async ({ params, oidcUser, status }) => {
      const result = await PostService.deletePostComment(params.id, params.commentId, oidcUser.sub)

      if (result.isErr()) {
        return match(result.error)
          .with(
            {
              code: 'RECORD_NOT_FOUND',
            },
            () =>
              status(404, {
                error: {
                  code: InternalErrorCode.POST_COMMENT_NOT_FOUND,
                  message: 'Post comment not found',
                },
              })
          )
          .otherwise(() => {
            return status(500, {
              error: {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'An unexpected error occurred',
              },
            })
          })
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
