import { Poll, PollDetails } from '@pple-today/api-common/dtos'
import { PollType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const PollIdParams = t.Object({
  pollId: t.String({ description: 'The ID of the draft poll' }),
})
export type PollIdParams = Static<typeof PollIdParams>

export const GetPollsQuery = t.Object({
  type: t.Optional(
    t.Union(
      [
        t.Literal('publish', { description: 'String `publish`' }),
        t.Literal('draft', { description: 'String `draft`' }),
      ],
      {
        description: 'Type of poll',
      }
    )
  ),
  limit: t.Optional(t.Number({ default: 10 })),
  page: t.Optional(t.Number({ default: 1 })),
})
export type GetPollsQuery = Static<typeof GetPollsQuery>

export const GetPollsResponse = t.Array(Poll)
export type GetPollsResponse = Static<typeof GetPollsResponse>

export const GetPollByIdParams = PollIdParams
export type GetPollByIdParams = Static<typeof GetPollByIdParams>

export const GetPollByIdResponse = t.Composite([Poll, PollDetails])
export type GetPollByIdResponse = Static<typeof GetPollByIdResponse>

export const PostPollBody = t.Object({
  title: t.String({ description: 'The title of the poll' }),
  description: t.String({ description: 'The description of the poll' }),
  endAt: t.Date({ description: 'The end date of the poll' }),
  type: t.Enum(PollType),

  optionTitles: t.Array(t.String({ description: 'The title of the poll option' })),
  topicIds: t.Array(t.String({ description: 'The ID of the poll topic' })),
})
export type PostPollBody = Static<typeof PostPollBody>

export const PostPollResponse = t.Object({
  id: t.String({ description: 'The ID of the created poll' }),
})
export type PostPollResponse = Static<typeof PostPollResponse>

export const PutPollParams = PollIdParams
export type PutPollParams = Static<typeof PutPollParams>

export const PutPollBody = t.Object({
  title: t.String({ description: 'The title of the poll' }),
  description: t.Nullable(t.String({ description: 'The description of the poll' })),
  endAt: t.Date({ description: 'The end date of the poll' }),
  type: t.Enum(PollType),

  optionTitles: t.Array(t.String({ description: 'The title of the poll option' })),
  topicIds: t.Array(t.String({ description: 'The ID of the poll topic' })),
})
export type PutPollBody = Static<typeof PutPollBody>

export const PutPollResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type PutPollResponse = Static<typeof PutPollResponse>

export const DeletePollParams = PollIdParams
export type DeletePollParams = Static<typeof DeletePollParams>

export const DeletePollResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeletePollResponse = Static<typeof DeletePollResponse>
