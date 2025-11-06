import { DetailedPost, Post } from '@pple-today/api-common/dtos'
import { PostStatus } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const PostIdParams = t.Object({
  postId: t.String({ description: 'The ID of the post' }),
})
export type PostIdParams = Static<typeof PostIdParams>

export const GetPostsQuery = t.Object({
  limit: t.Number(),
  page: t.Number(),
  search: t.Optional(t.String()),
  status: t.Optional(t.Array(t.Enum(PostStatus))),
  authorId: t.Optional(t.String()),
})
export type GetPostsQuery = Static<typeof GetPostsQuery>

export const GetPostsResponse = t.Object({
  items: t.Array(Post),
  meta: t.Object({ count: t.Number() }),
})
export type GetPostsResponse = Static<typeof GetPostsResponse>

export const GetPostByIdParams = PostIdParams
export type GetPostByIdParams = Static<typeof PostIdParams>

export const GetPostByIdResponse = DetailedPost
export type GetPostByIdResponse = Static<typeof GetPostByIdResponse>

export const UpdatePostParams = PostIdParams
export type UpdatePostParams = Static<typeof UpdatePostParams>

export const UpdatePostBody = t.Partial(
  t.Object({
    status: t.Enum(PostStatus, { description: 'The status of the post' }),
  })
)
export type UpdatePostBody = Static<typeof UpdatePostBody>

export const UpdatePostResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type UpdatePostResponse = Static<typeof UpdatePostResponse>

export const DeletePostParams = PostIdParams
export type DeletePostParams = Static<typeof DeletePostParams>

export const DeletePostResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeletePostResponse = Static<typeof DeletePostResponse>
