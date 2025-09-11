import { Static, t } from 'elysia'

export const ListAnnouncementsQuery = t.Object({
  cursor: t.Optional(t.String({ description: 'Cursor for pagination' })),
  limit: t.Optional(t.Number({ description: 'Limit for pagination', default: 10 })),
})
export type ListAnnouncementsQuery = Static<typeof ListAnnouncementsQuery>

export const ListAnnouncementsResponse = t.Object({
  announcements: t.Array(
    t.Object({
      id: t.String({ description: 'The ID of the announcement' }),
      title: t.String({ description: 'The title of the announcement' }),
      content: t.String({ description: 'The content of the announcement' }),
      createdAt: t.Date({ description: 'Creation date of the announcement' }),
      updatedAt: t.Date({ description: 'Last update date of the announcement' }),
    })
  ),
})
export type ListAnnouncementsResponse = Static<typeof ListAnnouncementsResponse>

export const ListFollowedAnnouncementsQuery = t.Object({
  cursor: t.Optional(t.String({ description: 'Cursor for pagination' })),
  limit: t.Optional(t.Number({ description: 'Limit for pagination', default: 10 })),
})
export type ListFollowedAnnouncementsQuery = Static<typeof ListFollowedAnnouncementsQuery>

export const ListFollowedAnnouncementsResponse = t.Object({
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
export type ListFollowedAnnouncementsResponse = Static<typeof ListFollowedAnnouncementsResponse>

export const ListAnnouncementByHashTagIdParams = t.Object({
  id: t.String({ description: 'The ID of the hashtag' }),
})
export type ListAnnouncementByHashTagIdParams = Static<typeof ListAnnouncementByHashTagIdParams>

export const ListAnnouncementByHashTagIdQuery = t.Object({
  cursor: t.Optional(t.String({ description: 'Cursor for pagination' })),
  limit: t.Optional(t.Number({ description: 'Limit for pagination', default: 10 })),
})
export type ListAnnouncementByHashTagIdQuery = Static<typeof ListAnnouncementByHashTagIdQuery>

export const ListAnnouncementByHashTagIdResponse = t.Object({
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
export type ListAnnouncementByHashTagIdResponse = Static<typeof ListAnnouncementByHashTagIdResponse>

export const ListAnnouncementByTopicIdParams = t.Object({
  id: t.String({ description: 'The ID of the topic' }),
})
export type ListAnnouncementByTopicIdParams = Static<typeof ListAnnouncementByTopicIdParams>

export const ListAnnouncementByTopicIdQuery = t.Object({
  cursor: t.Optional(t.String({ description: 'Cursor for pagination' })),
  limit: t.Optional(t.Number({ description: 'Limit for pagination', default: 10 })),
})
export type ListAnnouncementByTopicIdQuery = Static<typeof ListAnnouncementByTopicIdQuery>

export const ListAnnouncementByTopicIdResponse = t.Object({
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
export type ListAnnouncementByTopicIdResponse = Static<typeof ListAnnouncementByTopicIdResponse>

export const GetAnnouncementByIdParams = t.Object({
  id: t.String({ description: 'The ID of the announcement' }),
})
export type GetAnnouncementByIdParams = Static<typeof GetAnnouncementByIdParams>

export const GetAnnouncementByIdResponse = t.Object({
  id: t.String(),
  title: t.String(),
  content: t.String(),
  attachments: t.Array(t.String({ format: 'uri', description: 'Attachment URL' })),
  createdAt: t.Date(),
  updatedAt: t.Date(),
  feedItemId: t.String(),
})
export type GetAnnouncementByIdResponse = Static<typeof GetAnnouncementByIdResponse>
