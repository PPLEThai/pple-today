import { Static, t } from 'elysia'

import { AnnouncementType } from '../../../../__generated__/prisma'

export const PutDraftedAnnouncementBody = t.Object({
  title: t.String({ description: 'The title of the announcement' }),
  content: t.String({ description: 'The content of the announcement' }),
  type: t.Enum(AnnouncementType, { description: 'The type of the announcement' }),
  iconImage: t.String({ description: 'The icon image of the announcement', format: 'uri' }),
  backgroundColor: t.String({
    description: 'The background color of the announcement',
    pattern: '^#([A-Fa-f0-9]{3,4}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$',
  }),

  topicIds: t.Array(t.String({ description: 'The ID of the announcement topic' })),
  attachmentUrls: t.Array(t.String({ description: 'The URL of the announcement attachment' })),
})
export type PutDraftedAnnouncementBody = Static<typeof PutDraftedAnnouncementBody>
