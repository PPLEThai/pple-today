import { HashTag } from '@pple-today/api-common/dtos'
import { HashTagStatus } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const GetHashtagsQuery = t.Object({
  limit: t.Optional(t.Number({ default: 10 })),
  page: t.Optional(t.Number({ default: 1 })),
})
export type GetHashtagsQuery = Static<typeof GetHashtagsQuery>

export const GetHashtagsResponse = t.Array(HashTag)
export type GetHashtagsResponse = Static<typeof GetHashtagsResponse>

export const GetHashtagByIdParams = t.Object({
  hashtagId: t.String({ description: 'The ID of the hashtag' }),
})

export const GetHashtagByIdResponse = HashTag
export type GetHashtagByIdResponse = Static<typeof GetHashtagByIdResponse>

export const CreateHashtagBody = t.Object({
  name: t.String({ description: 'The name of the hashtag' }),
  status: t.Enum(HashTagStatus),
})
export type CreateHashtagBody = Static<typeof CreateHashtagBody>

export const CreateHashtagResponse = t.Object({
  hashtagId: t.String({ description: 'The ID of the hashtag' }),
})
export type CreateHashtagResponse = Static<typeof CreateHashtagResponse>

export const UpdateHashtagParams = t.Object({
  hashtagId: t.String({ description: 'The ID of the hashtag' }),
})

export const UpdateHashtagBody = t.Object({
  name: t.String({ description: 'The name of the hashtag' }),
  status: t.Enum(HashTagStatus),
})
export type UpdateHashtagBody = Static<typeof CreateHashtagBody>

export const UpdateHashtagResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type UpdateHashtagResponse = Static<typeof UpdateHashtagResponse>

export const DeleteHashtagParams = t.Object({
  hashtagId: t.String({ description: 'The ID of the hashtag' }),
})

export const DeleteHashtagResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeleteHashtagResponse = Static<typeof DeleteHashtagResponse>
