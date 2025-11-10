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

export const AdminPollDetails = t.Object({
  id: t.String({ description: 'The ID of the poll' }),
  title: t.String({ description: 'The title of the poll' }),
  type: t.Enum(PollType),
  reactions: t.Array(FeedItemReaction),
  commentCount: t.Number({ description: 'The comment count of the poll' }),
  publishedAt: t.Nullable(t.Date({ description: 'The publication date of the poll' })),
  createdAt: t.Date({ description: 'The creation date of the poll' }),
  updatedAt: t.Date({ description: 'The update date of the poll' }),

  totalVotes: t.Number({ description: 'The total vote count of the poll' }),
  endAt: t.Date({ description: 'The end date of the poll' }),
  status: t.Enum(PollStatus),
  options: t.Array(
    t.Object({
      id: t.String({ description: 'The ID of the poll option' }),
      title: t.String({ description: 'The title of the poll option' }),
      votes: t.Number({ description: 'The vote count of the poll option' }),
    })
  ),
  topics: t.Array(t.String({ description: 'The ID of the poll topic' })),
})

export type AdminPollDetails = Static<typeof AdminPollDetails>

export const AdminPollOptionAnswer = t.Object({
  id: t.String({ description: 'The ID of the poll option' }),
  title: t.String({ description: 'The title of the poll option' }),
  votes: t.Number({ description: 'The vote count of the poll option' }),
  answers: t.Array(
    t.Object({
      id: t.String({ description: 'The ID of the poll option answer' }),
      createdAt: t.Date(),
      user: t.Object({
        id: t.String({ description: 'The ID of the user' }),
        name: t.String({ description: 'The name of the user' }),
        profileImage: t.Nullable(t.String({ description: 'The profile image of the user' })),
      }),
    })
  ),
})
