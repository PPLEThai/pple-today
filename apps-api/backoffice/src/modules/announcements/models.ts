import { Static, t } from 'elysia'

export const GetAnnouncementsQuery = t.Object({
  limit: t.Optional(t.Number({ default: 10 })),
  page: t.Optional(t.Number({ default: 1 })),
})
export type GetAnnouncementsQuery = Static<typeof GetAnnouncementsQuery>

export const GetAnnouncementsResponse = t.Object({
  announcements: t.Array(
    t.Object({
      id: t.String({ description: 'The ID of the announcement' }),
      title: t.String({ description: 'The title of the announcement' }),
      content: t.String({ description: 'The content of the announcement' }),
      backgroundColor: t.String({ description: 'Background color for the announcement' }),
      createdAt: t.Date({ description: 'Creation date of the announcement' }),
      updatedAt: t.Date({ description: 'Last update date of the announcement' }),
    })
  ),
})
export type GetAnnouncementsResponse = Static<typeof GetAnnouncementsResponse>

export const GetAnnouncementByIdParams = t.Object({
  id: t.String({ description: 'The ID of the announcement' }),
})
export type GetAnnouncementByIdParams = Static<typeof GetAnnouncementByIdParams>

export const GetAnnouncementByIdResponse = t.Object({
  id: t.String(),
  title: t.String(),
  content: t.String(),
  backgroundColor: t.String(),
  attachments: t.Array(t.String({ format: 'uri', description: 'Attachment URL' })),
  createdAt: t.Date(),
  updatedAt: t.Date(),
  feedItemId: t.String(),
})
export type GetAnnouncementByIdResponse = Static<typeof GetAnnouncementByIdResponse>
