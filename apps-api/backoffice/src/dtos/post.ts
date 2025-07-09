import { Static, t } from 'elysia'

import { AuthorSchema } from './user'

export { PostReactionType } from '../../__generated__/prisma'

export const Post = t.Object({
  id: t.String({ description: 'The ID of the post' }),
  title: t.String({ description: 'The title of the post' }),
  content: t.String({ description: 'The content of the post' }),
  publishedAt: t.String({ description: 'The creation date of the post' }),
  commentCount: t.Number({ description: 'The number of comments on the post' }),
  author: AuthorSchema,
  hashTags: t.Array(
    t.Object({
      id: t.String({ description: 'The ID of the hashtag' }),
      name: t.String({ description: 'The name of the hashtag' }),
    })
  ),
  reactions: t.Array(
    t.Object({
      type: t.String({ description: 'The type of reaction, e.g., UP_VOTE or DOWN_VOTE' }),
      count: t.Number({ description: 'Optional comment for the reaction' }),
    })
  ),
  yourReaction: t.Optional(t.Union([t.Literal('UP_VOTE'), t.Literal('DOWN_VOTE')])),
})
export type Post = Static<typeof Post>

export const PostComment = t.Object({
  id: t.String({ description: 'The ID of the comment' }),
  content: t.String({ description: 'The content of the comment' }),
  createdAt: t.Date({ description: 'The creation date of the comment' }),
  isPrivate: t.Optional(t.Boolean({ description: 'Whether the comment is private' })),
  author: AuthorSchema,
})
export type PostComment = Static<typeof PostComment>

export const PostReaction = t.Object({
  type: t.String({ description: 'The type of reaction, e.g., UP_VOTE or DOWN_VOTE' }),
  count: t.Number({ description: 'The count of reactions of this type' }),
})
export type PostReaction = Static<typeof PostReaction>
