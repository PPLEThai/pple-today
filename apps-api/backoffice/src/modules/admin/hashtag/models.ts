import { HashTag } from '@pple-today/api-common/dtos'
import { HashTagStatus } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const GetHashtagsQuery = t.Object({
  limit: t.Optional(t.Number({ default: 10 })),
  page: t.Optional(t.Number({ default: 1 })),
  search: t.Optional(t.String()),
})
export type GetHashtagsQuery = Static<typeof GetHashtagsQuery>

export const GetHashtagsResponse = t.Object({ data: t.Array(HashTag), count: t.Number() })
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
export type UpdateHashtagParams = Static<typeof UpdateHashtagParams>

export const UpdateHashtagBody = t.Partial(
  t.Object({
    name: t.String({ description: 'The name of the hashtag' }),
    status: t.Enum(HashTagStatus),
  })
)
export type UpdateHashtagBody = Static<typeof UpdateHashtagBody>

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
