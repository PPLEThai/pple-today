import { Static, t } from 'elysia'

import { PollType } from '../../../../__generated__/prisma'
import { DraftedPoll, PollDetails, PublishedPoll } from '../../../dtos/poll'

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

export const GetPollsResponse = t.Array(t.Union([PublishedPoll, DraftedPoll]))
export type GetPollsResponse = Static<typeof GetPollsResponse>

export const PollIdParams = t.Object({
  pollId: t.String({ description: 'The ID of the drafted poll' }),
})

export const GetPublishedPollsResponse = t.Array(PublishedPoll)
export type GetPublishedPollsResponse = Static<typeof GetPublishedPollsResponse>

export const GetDraftedPollsResponse = t.Array(DraftedPoll)
export type GetDraftedPollsResponse = Static<typeof GetDraftedPollsResponse>

export const GetPublishedPollResponse = t.Composite([PublishedPoll, PollDetails])
export type GetPublishedPollResponse = Static<typeof GetPublishedPollResponse>

export const GetDraftedPollResponse = t.Composite([DraftedPoll, PollDetails])
export type GetDraftedPollResponse = Static<typeof GetDraftedPollResponse>

export const PostDraftedPollResponse = t.Object({
  pollId: t.String({ description: 'The ID of the drafted poll' }),
})
export type PostDraftedPollResponse = Static<typeof PostDraftedPollResponse>

export const PutDraftedPollBody = t.Object({
  title: t.Nullable(t.String({ description: 'The title of the poll' })),
  description: t.Nullable(t.String({ description: 'The description of the poll' })),
  endAt: t.Nullable(t.Date({ description: 'The end date of the poll' })),
  type: t.Enum(PollType),

  optionTitles: t.Array(t.String({ description: 'The title of the poll option' })),
  topicIds: t.Array(t.String({ description: 'The ID of the poll topic' })),
})
export type PutDraftedPollBody = Static<typeof PutDraftedPollBody>

export const PutDraftedPollResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type PutDraftedPollResponse = Static<typeof PutDraftedPollResponse>

export const DraftedPollPublishedResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DraftedPollPublishedResponse = Static<typeof DraftedPollPublishedResponse>

export const DeleteDraftedPollResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeleteDraftedPollResponse = Static<typeof DeleteDraftedPollResponse>

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
