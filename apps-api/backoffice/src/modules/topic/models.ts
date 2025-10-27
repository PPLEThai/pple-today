import { Static, t } from 'elysia'

export const GetTopicRecommendationResponse = t.Array(
  t.Object({
    id: t.String(),
    name: t.String(),
    description: t.Nullable(t.String()),
    bannerImage: t.Nullable(t.String()),
    hashTags: t.Array(
      t.Object({
        id: t.String(),
        name: t.String(),
      })
    ),
  })
)
export type GetTopicRecommendationResponse = Static<typeof GetTopicRecommendationResponse>

export const GetTopicResponse = t.Object({
  id: t.String(),
  name: t.String(),
  description: t.Nullable(t.String()),
  bannerImage: t.Nullable(t.String()),
  createdAt: t.Date(),
  updatedAt: t.Date(),
  hashTags: t.Array(
    t.Object({
      id: t.String(),
      name: t.String(),
      createdAt: t.Date(),
      updatedAt: t.Date(),
    })
  ),
})
export type GetTopicResponse = Static<typeof GetTopicResponse>

export const GetTopicParams = t.Object({ id: t.String() })
export type GetTopicParams = Static<typeof GetTopicParams>

export const GetTopicsResponse = t.Array(GetTopicResponse)
export type GetTopicsResponse = Static<typeof GetTopicsResponse>

export const ListTopicResponse = t.Array(
  t.Object({
    id: t.String(),
    name: t.String(),
    followed: t.Boolean(),
  })
)
export type ListTopicResponse = Static<typeof ListTopicResponse>

export const FollowTopicParams = t.Object({
  topicId: t.String(),
})

export type FollowTopicParams = typeof FollowTopicParams.static

export const FollowTopicsBody = t.Object({
  topicIds: t.Array(t.String()),
})
export type FollowTopicsBody = Static<typeof FollowTopicsBody>

export const FollowTopicResponse = t.Object({
  message: t.String(),
})

export type FollowTopicResponse = typeof FollowTopicResponse.static

export const UnFollowTopicParams = t.Object({
  topicId: t.String(),
})

export type UnFollowTopicParams = typeof UnFollowTopicParams.static
