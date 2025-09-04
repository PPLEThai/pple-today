import { FilePath } from '@pple-today/api-common/dtos'
import { AnnouncementType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { Topic } from './topic'

export const PublishedAnnouncement = t.Object({
  id: t.String({ description: 'The ID of the announcement' }),
  title: t.String({ description: 'The title of the announcement' }),
  content: t.Nullable(t.String({ description: 'The content of the announcement' })),
  type: t.Enum(AnnouncementType, { description: 'The type of the announcement' }),
  iconImage: t.Nullable(
    t.String({ description: 'The icon image of the announcement', format: 'uri' })
  ),
  backgroundColor: t.Nullable(
    t.String({
      description: 'The background color of the announcement',
      pattern: '^#([A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$',
    })
  ),
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
export type PublishedAnnouncement = Static<typeof PublishedAnnouncement>

export const DraftAnnouncement = t.Composite([
  t.Pick(PublishedAnnouncement, [
    'id',
    'content',
    'iconImage',
    'backgroundColor',
    'createdAt',
    'updatedAt',
    'topics',
    'attachments',
  ]),
  t.Object({
    title: t.Nullable(t.String({ description: 'The title of the announcement' })),
    type: t.Nullable(t.Enum(AnnouncementType, { description: 'The type of the announcement' })),
  }),
])
export type DraftAnnouncement = Static<typeof DraftAnnouncement>
