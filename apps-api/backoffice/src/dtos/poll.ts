import { Static, t } from 'elysia'

import { PollType } from '@pple-today/database/prisma'

export const PublishedPoll = t.Object({
  id: t.String({ description: 'The ID of the poll' }),

  title: t.String({ description: 'The title of the poll' }),
  description: t.Nullable(t.String({ description: 'The description of the poll' })),
  endAt: t.Date({ description: 'The end date of the poll' }),
  type: t.Enum(PollType),

  createdAt: t.Date({ description: 'The creation date of the poll' }),
  updatedAt: t.Date({ description: 'The update date of the poll' }),
})
export type PublishedPoll = Static<typeof PublishedPoll>

export const DraftPoll = t.Composite([
  t.Pick(PublishedPoll, ['id', 'description', 'type', 'createdAt', 'updatedAt']),
  t.Object({
    title: t.Nullable(t.String({ description: 'The title of the poll' })),
    endAt: t.Nullable(t.Date({ description: 'The end date of the poll' })),
  }),
])
export type DraftPoll = Static<typeof DraftPoll>

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
