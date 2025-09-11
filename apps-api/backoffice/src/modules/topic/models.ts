import { HashTagStatus, TopicStatus } from '@pple-today/database/prisma'
import { t } from 'elysia'

export const GetTopicsResponse = t.Array(
  t.Object({
    id: t.String(),
    name: t.String(),
    description: t.Nullable(t.String()),
    bannerImage: t.Nullable(t.String()),
    status: t.Enum(TopicStatus),
    createdAt: t.Date(),
    updatedAt: t.Date(),
    hashTags: t.Array(
      t.Object({
        id: t.String(),
        name: t.String(),
        status: t.Enum(HashTagStatus),
        createdAt: t.Date(),
        updatedAt: t.Date(),
      })
    ),
  })
)
export type GetTopicsResponse = typeof GetTopicsResponse.static

export const GetHashtagResponse = t.Object({
  id: t.String(),
  name: t.String(),
  createdAt: t.Date(),
  topics: t.Array(t.Object({ id: t.String(), name: t.String() })),
})
export type GetHashtagResponse = typeof GetHashtagResponse.static

export const FollowTopicParams = t.Object({
  topicId: t.String(),
})

export type FollowTopicParams = typeof FollowTopicParams.static

export const FollowTopicResponse = t.Object({
  message: t.String(),
})

export type FollowTopicResponse = typeof FollowTopicResponse.static

export const UnFollowTopicParams = t.Object({
  topicId: t.String(),
})

export type UnFollowTopicParams = typeof UnFollowTopicParams.static
