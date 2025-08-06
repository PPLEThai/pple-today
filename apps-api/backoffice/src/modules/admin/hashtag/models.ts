import { Static, t } from 'elysia'

import { HashTagStatus } from '../../../../__generated__/prisma'
import { HashTag } from '../../../dtos/tag'

export const GetHashtagsQuery = t.Object({
  limit: t.Optional(t.Number({ default: 10 })),
  page: t.Optional(t.Number({ default: 1 })),
})
export type GetHashtagsQuery = Static<typeof GetHashtagsQuery>

export const HashtagIdParams = t.Object({
  hashtagId: t.String({ description: 'The ID of the hashtag' }),
})

export const GetHashtagsResponse = t.Array(HashTag)
export type GetHashtagsResponse = Static<typeof GetHashtagsResponse>

export const GetHashtagResponse = HashTag
export type GetHashtagResponse = Static<typeof GetHashtagResponse>

export const PostHashtagResponse = t.Object({
  hashtagId: t.String({ description: 'The ID of the hashtag' }),
})
export type PostHashtagResponse = Static<typeof PostHashtagResponse>

export const PutHashtagBody = t.Object({
  name: t.String({ description: 'The name of the hashtag' }),
  status: t.Enum(HashTagStatus),
})
export type PutHashtagBody = Static<typeof PutHashtagBody>

export const PutHashtagResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type PutHashtagResponse = Static<typeof PutHashtagResponse>

export const DeleteHashtagResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeleteHashtagResponse = Static<typeof DeleteHashtagResponse>
