import { TopicStatus } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { FilePath } from '.'

export const Topic = t.Object({
  id: t.String({ description: 'The ID of the topic' }),
  name: t.String({ description: 'The name of the topic' }),
  description: t.Nullable(t.String({ description: 'The description of the topic' })),
  status: t.Enum(TopicStatus),
  followersCount: t.Number({ description: 'The number of follower of the topic' }),
  createdAt: t.Date({ description: 'The creation date of the topic' }),
  updatedAt: t.Date({ description: 'The update date of the topic' }),
})
export type Topic = Static<typeof Topic>

export const DetailedTopic = t.Composite([
  Topic,
  t.Object({
    bannerImage: t.Nullable(
      t.Object({
        url: t.String({ description: 'The URL of the banner image' }),
        filePath: FilePath,
      })
    ),
    hashtags: t.Array(
      t.Object({
        id: t.String({ description: 'The ID of the hashtag' }),
        name: t.String({ description: 'The name of the hashtag' }),
      })
    ),
  }),
])
export type DetailedTopic = Static<typeof DetailedTopic>
