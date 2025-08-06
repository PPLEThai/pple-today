import { Static, t } from 'elysia'

import { TopicStatus } from '../../__generated__/prisma'

export const Topic = t.Object({
  id: t.String({ description: 'The ID of the topic' }),
  name: t.String({ description: 'The name of the topic' }),
  description: t.Nullable(t.String({ description: 'The description of the topic' })),
  status: t.Enum(TopicStatus),
  createdAt: t.Date({ description: 'The creation date of the topic' }),
  updatedAt: t.Date({ description: 'The update date of the topic' }),
})
export type Topic = Static<typeof Topic>

export const DetailedTopic = t.Composite([
  Topic,
  t.Object({
    bannerImage: t.Nullable(t.String({ description: 'The banner image of the topic' })),
    hashtags: t.Array(t.String({ description: 'The name of the hashtag' })),
  }),
])
export type DetailedTopic = Static<typeof DetailedTopic>
