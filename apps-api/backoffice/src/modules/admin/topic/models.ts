import { Static, t } from 'elysia'

import { TopicStatus } from '../../../../__generated__/prisma'
import { DetailedTopic, Topic } from '../../../dtos/topic'

export const GetTopicsQuery = t.Object({
  limit: t.Optional(t.Number({ default: 10 })),
  page: t.Optional(t.Number({ default: 1 })),
})
export type GetTopicsQuery = Static<typeof GetTopicsQuery>

export const TopicIdParams = t.Object({
  topicId: t.String({ description: 'The ID of the topic' }),
})

export const GetTopicsResponse = t.Array(Topic)
export type GetTopicsResponse = Static<typeof GetTopicsResponse>

export const GetTopicResponse = DetailedTopic
export type GetTopicResponse = Static<typeof GetTopicResponse>

export const PostTopicResponse = t.Object({
  topicId: t.String({ description: 'The ID of the topic' }),
})
export type PostTopicResponse = Static<typeof PostTopicResponse>

export const PutTopicBody = t.Object({
  name: t.String({ description: 'The name of the topic' }),
  description: t.Nullable(t.String({ description: 'The description of the topic' })),
  bannerImage: t.Nullable(t.String({ description: 'The banner image of the topic' })),
  status: t.Enum(TopicStatus),
  hashtagIds: t.Array(t.String({ description: 'The ID of the hashtag' })),
})
export type PutTopicBody = Static<typeof PutTopicBody>

export const PutTopicResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type PutTopicResponse = Static<typeof PutTopicResponse>

export const DeleteTopicResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeleteTopicResponse = Static<typeof DeleteTopicResponse>
