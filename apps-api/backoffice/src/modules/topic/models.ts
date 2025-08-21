import { t } from 'elysia'
import { HashTagStatus, TopicStatus } from '../../../__generated__/prisma'

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
