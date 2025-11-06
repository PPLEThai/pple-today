import { AdminPollDetails, ListPaginationQuery } from '@pple-today/api-common/dtos'
import { PollStatus, PollType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const PollIdParams = t.Object({
  pollId: t.String({ description: 'The ID of the draft poll' }),
})
export type PollIdParams = Static<typeof PollIdParams>

export const GetPollsQuery = ListPaginationQuery(
  t.Object({
    search: t.Optional(t.String({ description: 'The search query for the poll title' })),
    status: t.Optional(
      t.Array(
        t.Union(
          [
            t.Literal('PUBLISHED', { description: 'String `publish`' }),
            t.Literal('DRAFT', { description: 'String `draft`' }),
            t.Literal('ARCHIVED', { description: 'String `archived`' }),
          ],
          {
            description: 'Type of poll',
          }
        )
      )
    ),
  })
)
export type GetPollsQuery = Static<typeof GetPollsQuery>

export const GetPollsResponse = t.Object({
  data: t.Array(AdminPollDetails),
  meta: t.Object({ count: t.Number() }),
})
export type GetPollsResponse = Static<typeof GetPollsResponse>

export const GetPollByIdParams = PollIdParams
export type GetPollByIdParams = Static<typeof GetPollByIdParams>

export const GetPollByIdResponse = AdminPollDetails
export type GetPollByIdResponse = Static<typeof GetPollByIdResponse>

export const PostPollBody = t.Object({
  title: t.String({ description: 'The title of the poll' }),
  description: t.Nullable(t.String({ description: 'The description of the poll' })),
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

export const UpdatePollParams = PollIdParams
export type UpdatePollParams = Static<typeof UpdatePollParams>

export const UpdatePollBody = t.Partial(
  t.Object({
    title: t.String({ description: 'The title of the poll' }),
    description: t.Nullable(t.String({ description: 'The description of the poll' })),
    endAt: t.Date({ description: 'The end date of the poll' }),
    type: t.Enum(PollType),

    optionTitles: t.Array(t.String({ description: 'The title of the poll option' })),
    topicIds: t.Array(t.String({ description: 'The ID of the poll topic' })),

    status: t.Enum(PollStatus),
  })
)
export type UpdatePollBody = Static<typeof UpdatePollBody>

export const UpdatePollResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type UpdatePollResponse = Static<typeof UpdatePollResponse>

export const DeletePollParams = PollIdParams
export type DeletePollParams = Static<typeof DeletePollParams>

export const DeletePollResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeletePollResponse = Static<typeof DeletePollResponse>
