import { Post, PostComment, PostReactionType } from '@/dtos/post'

import { Static, t } from 'elysia'

export const GetPostByIdParams = t.Object({
  id: t.String({ description: 'The ID of the post' }),
})
export const GetPostByIdResponse = Post

export type GetPostByIdParams = Static<typeof GetPostByIdParams>
export type GetPostByIdResponse = Static<typeof GetPostByIdResponse>

export const GetPostCommentParams = t.Object({
  id: t.String({ description: 'The ID of the post' }),
})
export const GetPostCommentQuery = t.Object({
  page: t.Optional(t.Number({ description: 'The page number for pagination', default: 1 })),
  limit: t.Optional(t.Number({ description: 'The number of comments per page', default: 10 })),
})
export const GetPostCommentResponse = t.Array(PostComment)

export type GetPostCommentParams = Static<typeof GetPostCommentParams>
export type GetPostCommentQuery = Static<typeof GetPostCommentQuery>
export type GetPostCommentResponse = Static<typeof GetPostCommentResponse>

export const CreatePostReactionParams = t.Object({
  id: t.String({ description: 'The ID of the post' }),
})
export const CreatePostReactionBody = t.Union([
  t.Object({
    type: t.Literal(PostReactionType.UP_VOTE),
  }),
  t.Object({
    type: t.Literal(PostReactionType.DOWN_VOTE),
    comment: t.String({ description: 'Optional comment for the reaction' }),
  }),
])
export const CreatePostReactionResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})

export type CreatePostReactionParams = Static<typeof CreatePostReactionParams>
export type CreatePostReactionBody = Static<typeof CreatePostReactionBody>
export type CreatePostReactionResponse = Static<typeof CreatePostReactionResponse>

export const DeletePostReactionParams = t.Object({
  id: t.String({ description: 'The ID of the post' }),
})
export const DeletePostReactionResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})

export type DeletePostReactionParams = Static<typeof DeletePostReactionParams>
export type DeletePostReactionResponse = Static<typeof DeletePostReactionResponse>

export const CreatePostCommentParams = t.Object({
  id: t.String({ description: 'The ID of the post' }),
})
export const CreatePostCommentBody = t.Object({
  content: t.String({ description: 'The content of the comment' }),
})
export const CreatePostCommentResponse = t.Object({
  id: t.String({ description: 'The ID of the created comment' }),
})

export type CreatePostCommentParams = Static<typeof CreatePostCommentParams>
export type CreatePostCommentBody = Static<typeof CreatePostCommentBody>
export type CreatePostCommentResponse = Static<typeof CreatePostCommentResponse>

export const UpdatePostCommentParams = t.Object({
  id: t.String({ description: 'The ID of the post' }),
  commentId: t.String({ description: 'The ID of the comment' }),
})
export const UpdatePostCommentBody = t.Object({
  content: t.String({ description: 'The updated content of the comment' }),
})
export const UpdatePostCommentResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})

export type UpdatePostCommentParams = Static<typeof UpdatePostCommentParams>
export type UpdatePostCommentBody = Static<typeof UpdatePostCommentBody>
export type UpdatePostCommentResponse = Static<typeof UpdatePostCommentResponse>

export const DeletePostCommentParams = t.Object({
  id: t.String({ description: 'The ID of the post' }),
  commentId: t.String({ description: 'The ID of the comment' }),
})
export const DeletePostCommentResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})

export type DeletePostCommentParams = Static<typeof DeletePostCommentParams>
export type DeletePostCommentResponse = Static<typeof DeletePostCommentResponse>
