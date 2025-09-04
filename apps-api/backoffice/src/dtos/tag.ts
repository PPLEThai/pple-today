import { Static, t } from 'elysia'

import { HashTagStatus } from '@pple-today/database/prisma'

export const HashTag = t.Object({
  id: t.String({ description: 'The ID of the hashtag' }),
  name: t.String({ description: 'The name of the hashtag' }),
  status: t.Enum(HashTagStatus),
  createdAt: t.Date({ description: 'The creation date of the hashtag' }),
  updatedAt: t.Date({ description: 'The last update date of the hashtag' }),
})
export type HashTag = Static<typeof HashTag>
