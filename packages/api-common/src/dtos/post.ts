import { PostStatus } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { FeedItemComment, FeedItemReaction } from './feed'

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

export const DetailedPost = t.Composite([
  Post,
  t.Object({
    author: t.Object({
      name: t.String({ description: 'The name of the author' }),
      profileImage: t.Optional(t.String({ description: 'The profile image URL of the author' })),
      responsibleArea: t.Nullable(t.String({ description: 'The responsible area of the author' })),
    }),
    attachments: t.Array(
      t.Object({
        attachmentPath: t.String({ description: 'The signed URL of the post', format: 'uri' }),
      })
    ),
    hashtags: t.Array(
      t.Object({
        id: t.String({ description: 'The ID of the post' }),
        name: t.String({ description: 'The name of the post' }),
      })
    ),
    comments: t.Array(FeedItemComment),
  }),
])
export type DetailedPost = Static<typeof DetailedPost>
