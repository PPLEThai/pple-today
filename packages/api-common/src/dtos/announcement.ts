import { AnnouncementType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { FilePath } from './file'
import { Topic } from './topic'

export const Announcement = t.Object({
  id: t.String({ description: 'The ID of the announcement' }),
  title: t.String({ description: 'The title of the announcement' }),
  content: t.Nullable(t.String({ description: 'The content of the announcement' })),
  type: t.Enum(AnnouncementType, { description: 'The type of the announcement' }),
  createdAt: t.Date({ description: 'Creation date of the announcement' }),
  updatedAt: t.Date({ description: 'Last update date of the announcement' }),
  topics: t.Array(t.Pick(Topic, ['id', 'name'])),
  attachments: t.Array(
    t.Object({
      url: t.String({ description: 'The signed URL of the attachment', format: 'uri' }),
      filePath: FilePath,
    })
  ),
})
export type Announcement = Static<typeof Announcement>
