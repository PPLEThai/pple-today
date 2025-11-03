import { PollStatus, PollType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { FeedItemReaction } from './feed'

export const Poll = t.Object({
  id: t.String({ description: 'The ID of the poll' }),

  title: t.String({ description: 'The title of the poll' }),
  description: t.Nullable(t.String({ description: 'The description of the poll' })),
  endAt: t.Date({ description: 'The end date of the poll' }),
  status: t.Enum(PollStatus),
  type: t.Enum(PollType),
  totalVotes: t.Number({ description: 'The total vote count of the poll' }),

  createdAt: t.Date({ description: 'The creation date of the poll' }),
  updatedAt: t.Date({ description: 'The update date of the poll' }),
  publishedAt: t.Nullable(t.Date({ description: 'The publication date of the poll' })),
})
export type Poll = Static<typeof Poll>

export const PollDetails = t.Object({
  options: t.Array(
    t.Object({
      title: t.String({ description: 'The title of the poll option' }),
      votes: t.Number({ description: 'The vote count of the poll option' }),
    })
  ),
  topics: t.Array(t.String({ description: 'The ID of the poll topic' })),
})
export type PollDetails = Static<typeof PollDetails>

export const AdminPoll = t.Object({
  id: t.String({ description: 'The ID of the poll' }),
  title: t.String({ description: 'The title of the poll' }),
  reactions: t.Array(FeedItemReaction),
  commentCount: t.Number({ description: 'The comment count of the poll' }),
  publishedAt: t.Nullable(t.Date({ description: 'The publication date of the poll' })),
  createdAt: t.Date({ description: 'The creation date of the poll' }),
  updatedAt: t.Date({ description: 'The update date of the poll' }),
  endAt: t.Date({ description: 'The end date of the poll' }),
  status: t.Enum(PollStatus),
})
export type AdminPoll = Static<typeof AdminPoll>
