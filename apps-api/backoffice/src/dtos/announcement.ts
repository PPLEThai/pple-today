import { Static, t } from 'elysia'

import { Topic } from './topic'

import { AnnouncementType } from '../../__generated__/prisma'

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
  attachments: t.Array(t.String({ description: 'The file path of the announcement attachment' })),
})
export type PublishedAnnouncement = Static<typeof PublishedAnnouncement>

export const DraftedAnnouncement = t.Composite([
  t.Omit(PublishedAnnouncement, ['title', 'type']),
  t.Object({
    title: t.Nullable(t.String({ description: 'The title of the announcement' })),
    type: t.Nullable(t.Enum(AnnouncementType, { description: 'The type of the announcement' })),
  }),
])
export type DraftedAnnouncement = Static<typeof DraftedAnnouncement>
