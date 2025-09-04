import { Static, t } from 'elysia'

import { PollType } from '@pple-today/database/prisma'
import { DraftPoll, PollDetails, PublishedPoll } from '../../../dtos/poll'

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

export const GetPollsResponse = t.Array(t.Union([PublishedPoll, DraftPoll]))
export type GetPollsResponse = Static<typeof GetPollsResponse>

export const PollIdParams = t.Object({
  pollId: t.String({ description: 'The ID of the draft poll' }),
})

export const GetPublishedPollsResponse = t.Array(PublishedPoll)
export type GetPublishedPollsResponse = Static<typeof GetPublishedPollsResponse>

export const GetDraftPollsResponse = t.Array(DraftPoll)
export type GetDraftPollsResponse = Static<typeof GetDraftPollsResponse>

export const GetPublishedPollResponse = t.Composite([PublishedPoll, PollDetails])
export type GetPublishedPollResponse = Static<typeof GetPublishedPollResponse>

export const GetDraftPollResponse = t.Composite([DraftPoll, PollDetails])
export type GetDraftPollResponse = Static<typeof GetDraftPollResponse>

export const PostDraftPollResponse = t.Object({
  pollId: t.String({ description: 'The ID of the draft poll' }),
})
export type PostDraftPollResponse = Static<typeof PostDraftPollResponse>

export const PutDraftPollBody = t.Object({
  title: t.Nullable(t.String({ description: 'The title of the poll' })),
  description: t.Nullable(t.String({ description: 'The description of the poll' })),
  endAt: t.Nullable(t.Date({ description: 'The end date of the poll' })),
  type: t.Enum(PollType),

  optionTitles: t.Array(t.String({ description: 'The title of the poll option' })),
  topicIds: t.Array(t.String({ description: 'The ID of the poll topic' })),
})
export type PutDraftPollBody = Static<typeof PutDraftPollBody>

export const PutDraftPollResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type PutDraftPollResponse = Static<typeof PutDraftPollResponse>

export const DraftPollPublishedResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DraftPollPublishedResponse = Static<typeof DraftPollPublishedResponse>

export const DeleteDraftPollResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeleteDraftPollResponse = Static<typeof DeleteDraftPollResponse>

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

export const PublishedPollUnpublishedResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type PublishedPollUnpublishedResponse = Static<typeof PublishedPollUnpublishedResponse>

export const DeletePublishedPollResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeletePublishedPollResponse = Static<typeof DeletePublishedPollResponse>
