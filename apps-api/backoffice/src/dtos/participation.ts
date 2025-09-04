import { t } from 'elysia'

import { FeedItemType } from '@pple-today/database/prisma'

export const UserParticipation = t.Union([
  t.Object({
    type: t.Literal(FeedItemType.POLL),
    feedItemId: t.String({ description: 'The ID of the feed item' }),
    title: t.String({ description: 'The title of the poll' }),
    createdAt: t.Date({ description: 'The date and time when the activity occurred' }),
  }),
])
