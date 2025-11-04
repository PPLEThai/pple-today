import { FeedItemPoll, PaginationQuery } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const ListPollsQuery = PaginationQuery
export type ListPollsQuery = Static<typeof ListPollsQuery>

export const ListPollsResponse = t.Object({
  data: t.Array(FeedItemPoll),
})
export type ListPollsResponse = Static<typeof ListPollsResponse>

export const UpsertPollVoteParams = t.Object({
  id: t.String({ description: 'The ID of the poll' }),
})

export const UpsertPollVoteBody = t.Object({
  options: t.Array(t.String({ description: 'The IDs of the poll options that voted' })),
})

export type UpsertPollVoteParams = Static<typeof UpsertPollVoteParams>

export const UpsertPollVoteResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type UpsertPollVoteResponse = Static<typeof UpsertPollVoteResponse>
