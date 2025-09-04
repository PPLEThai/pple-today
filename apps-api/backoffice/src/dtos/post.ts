import { FeedItemReactionType as PostReactionType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { Author } from './user'

export { PostReactionType }

export const Post = t.Object({
  id: t.String({ description: 'The ID of the post' }),
  content: t.String({ description: 'The content of the post' }),
  createdAt: t.String({ description: 'The creation date of the post' }),
  commentCount: t.Number({ description: 'The number of comments on the post' }),
  author: Author,
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
  userReaction: t.Nullable(t.Enum(PostReactionType)),
})
export type Post = Static<typeof Post>

export const PostComment = t.Object({
  id: t.String({ description: 'The ID of the comment' }),
  content: t.String({ description: 'The content of the comment' }),
  createdAt: t.Date({ description: 'The creation date of the comment' }),
  isPrivate: t.Boolean({ description: 'Whether the comment is private' }),
  author: Author,
})
export type PostComment = Static<typeof PostComment>

export const PostReaction = t.Object({
  type: t.String({ description: 'The type of reaction, e.g., UP_VOTE or DOWN_VOTE' }),
  count: t.Number({ description: 'The count of reactions of this type' }),
})
export type PostReaction = Static<typeof PostReaction>
