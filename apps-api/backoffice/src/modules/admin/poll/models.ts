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

export const GetPollResponse = t.Composite([Poll, PollDetails])
export type GetPollResponse = Static<typeof GetPollResponse>

export const PutPublishedPollBody = t.Object({
  title: t.String({ description: 'The title of the poll' }),
  description: t.Nullable(t.String({ description: 'The description of the poll' })),
  endAt: t.Date({ description: 'The end date of the poll' }),
  type: t.Enum(PollType),

  optionTitles: t.Array(t.String({ description: 'The title of the poll option' })),
  topicIds: t.Array(t.String({ description: 'The ID of the poll topic' })),
})
export type PutPublishedPollBody = Static<typeof PutPublishedPollBody>

export const PutPublishedPollResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type PutPublishedPollResponse = Static<typeof PutPublishedPollResponse>

export const DeletePublishedPollResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeletePublishedPollResponse = Static<typeof DeletePublishedPollResponse>
