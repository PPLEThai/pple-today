import { AnnouncementStatus, AnnouncementType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { FeedItemReaction } from './feed'
import { FilePath } from './file'
import { Topic } from './topic'

export const Announcement = t.Object({
  id: t.String({ description: 'The ID of the announcement' }),
  title: t.String({ description: 'The title of the announcement' }),
  status: t.Enum(AnnouncementStatus, { description: 'The status of the announcement' }),
  type: t.Enum(AnnouncementType, { description: 'The type of the announcement' }),
  publishedAt: t.Nullable(t.Date({ description: 'Publication date of the announcement' })),
  createdAt: t.Date({ description: 'Creation date of the announcement' }),
  updatedAt: t.Date({ description: 'Last update date of the announcement' }),
  reactionCounts: t.Array(FeedItemReaction),
  commentsCount: t.Number({ description: 'The number of comments on the announcement' }),

  content: t.Nullable(t.String({ description: 'The content of the announcement' })),
  topics: t.Array(t.Pick(Topic, ['id', 'name'])),
  attachments: t.Array(
    t.Object({
      url: t.String({ description: 'The signed URL of the attachment', format: 'uri' }),
      filePath: FilePath,
    })
  ),
})
export type Announcement = Static<typeof Announcement>
