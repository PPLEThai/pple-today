import { FeedItemPoll } from '@pple-today/api-common/dtos'
import { PaginationQuery } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const ListPollsQuery = PaginationQuery
export type ListPollsQuery = Static<typeof ListPollsQuery>

export const ListPollsResponse = t.Object({
  data: t.Array(FeedItemPoll),
})
export type ListPollsResponse = Static<typeof ListPollsResponse>

export const CreatePollVoteParams = t.Object({
  id: t.String({ description: 'The ID of the poll' }),
  optionId: t.String({ description: 'The ID of the poll option to vote for' }),
})
export type CreatePollVoteParams = Static<typeof CreatePollVoteParams>

export const CreatePollVoteResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type CreatePollVoteResponse = Static<typeof CreatePollVoteResponse>

export const DeletePollVoteParams = t.Object({
  id: t.String({ description: 'The ID of the poll' }),
  optionId: t.String({ description: 'The ID of the poll option to delete the vote for' }),
})
export type DeletePollVoteParams = Static<typeof DeletePollVoteParams>

export const DeletePollVoteResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeletePollVoteResponse = Static<typeof DeletePollVoteResponse>
