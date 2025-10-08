import { FilePath } from '@pple-today/api-common/dtos'
import { DetailedTopic, Topic } from '@pple-today/api-common/dtos'
import { TopicStatus } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const GetTopicsQuery = t.Object({
  limit: t.Optional(t.Number({ default: 10 })),
  page: t.Optional(t.Number({ default: 1 })),
  search: t.Optional(t.String()),
})
export type GetTopicsQuery = Static<typeof GetTopicsQuery>

export const GetTopicsResponse = t.Object({
  data: t.Array(Topic),
  meta: t.Object({ count: t.Number() }),
})
export type GetTopicsResponse = Static<typeof GetTopicsResponse>

export const GetTopicByIdParams = t.Object({
  topicId: t.String({ description: 'The ID of the topic' }),
})

export const GetTopicByIdResponse = DetailedTopic
export type GetTopicByIdResponse = Static<typeof GetTopicByIdResponse>

export const CreateTopicBody = t.Object({
  name: t.String({ description: 'The name of the topic' }),
  description: t.Nullable(t.String({ description: 'The description of the topic' })),
  bannerImagePath: t.Nullable(FilePath),
  hashtagIds: t.Array(t.String({ description: 'The ID of the hashtag' })),
})
export type CreateTopicBody = Static<typeof CreateTopicBody>

export const CreateTopicResponse = t.Object({
  topicId: t.String({ description: 'The ID of the topic' }),
})
export type CreateTopicResponse = Static<typeof CreateTopicResponse>

export const UpdateTopicParams = t.Object({
  topicId: t.String({ description: 'The ID of the topic' }),
})
export type UpdateTopicParams = Static<typeof UpdateTopicParams>

export const UpdateTopicBody = t.Partial(
  t.Object({
    name: t.String({ description: 'The name of the topic' }),
    description: t.Nullable(t.String({ description: 'The description of the topic' })),
    bannerImagePath: t.Nullable(FilePath),
    status: t.Enum(TopicStatus),
    hashtagIds: t.Array(t.String({ description: 'The ID of the hashtag' })),
  })
)
export type UpdateTopicBody = Static<typeof UpdateTopicBody>

export const UpdateTopicResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type UpdateTopicResponse = Static<typeof UpdateTopicResponse>

export const DeleteTopicParams = t.Object({
  topicId: t.String({ description: 'The ID of the topic' }),
})

export const DeleteTopicResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeleteTopicResponse = Static<typeof DeleteTopicResponse>
