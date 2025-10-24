import { PostStatus } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { FeedItemReaction } from './feed'

export const Post = t.Object({
  id: t.String({ description: 'The ID of the post' }),

  content: t.Nullable(t.String({ description: 'The content of the post' })),
  status: t.Enum(PostStatus),
  reactionCounts: t.Array(FeedItemReaction),
  commentsCount: t.Number({ description: 'The number of comments on the post' }),

  createdAt: t.Date({ description: 'The creation date of the post' }),
  updatedAt: t.Date({ description: 'The update date of the post' }),
  publishedAt: t.Nullable(t.Date({ description: 'The publication date of the post' })),
})
export type Post = Static<typeof Post>

export const PostDetails = t.Object({
  options: t.Array(
    t.Object({
      title: t.String({ description: 'The title of the post option' }),
      votes: t.Number({ description: 'The vote count of the post option' }),
    })
  ),
  topics: t.Array(t.String({ description: 'The ID of the post topic' })),
})
export type PostDetails = Static<typeof PostDetails>
