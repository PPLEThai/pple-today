import { Announcement } from '@pple-today/api-common/dtos'
import { FilePath } from '@pple-today/api-common/dtos'
import { AnnouncementStatus, AnnouncementType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const AnnouncementIdParams = t.Object({
  announcementId: t.String({ description: 'The ID of the published/draft announcement' }),
})
export type AnnouncementIdParams = Static<typeof AnnouncementIdParams>

export const GetAnnouncementsQuery = t.Object({
  limit: t.Number(),
  page: t.Number(),
  search: t.Optional(t.String()),
  status: t.Optional(t.Array(t.Enum(AnnouncementStatus))),
})
export type GetAnnouncementsQuery = Static<typeof GetAnnouncementsQuery>

export const GetAnnouncementsResponse = t.Object({
  data: t.Array(
    t.Pick(Announcement, [
      'id',
      'title',
      'reactionCounts',
      'commentsCount',
      'status',
      'type',
      'publishedAt',
      'createdAt',
      'updatedAt',
    ])
  ),
  meta: t.Object({ count: t.Number() }),
})
export type GetAnnouncementsResponse = Static<typeof GetAnnouncementsResponse>

export const GetAnnouncementByIdParams = AnnouncementIdParams
export type GetAnnouncementByIdParams = Static<typeof GetAnnouncementByIdParams>

export const GetAnnouncementByIdResponse = t.Pick(Announcement, [
  'id',
  'status',
  'content',
  'createdAt',
  'updatedAt',
  'topics',
  'title',
  'type',
  'attachments',
  'publishedAt',
])
export type GetAnnouncementByIdResponse = Static<typeof GetAnnouncementByIdResponse>

export const PostAnnouncementBody = t.Object({
  title: t.String({ description: 'The title of the announcement' }),
  content: t.String({ description: 'The content of the announcement' }),
  type: t.Enum(AnnouncementType, { description: 'The type of the announcement' }),
  topicIds: t.Array(t.String({ description: 'The ID of the announcement topic' })),
  attachmentFilePaths: t.Array(FilePath),
})

export type PostAnnouncementBody = Static<typeof PostAnnouncementBody>
export const PostAnnouncementResponse = t.Object({
  announcementId: t.String({ description: 'The ID of the announcement' }),
})
export type PostAnnouncementResponse = Static<typeof PostAnnouncementResponse>

export const PutAnnouncementParams = AnnouncementIdParams
export type PutAnnouncementParams = Static<typeof PutAnnouncementParams>

export const PutAnnouncementBody = t.Object({
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

  topicIds: t.Array(t.String({ description: 'The ID of the announcement topic' })),
  attachmentFilePaths: t.Array(FilePath),
})
export type PutAnnouncementBody = Static<typeof PutAnnouncementBody>

export const PutAnnouncementResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type PutAnnouncementResponse = Static<typeof PutAnnouncementResponse>

export const DeleteAnnouncementParams = AnnouncementIdParams
export type DeleteAnnouncementParams = Static<typeof DeleteAnnouncementParams>

export const DeleteAnnouncementResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeleteAnnouncementResponse = Static<typeof DeleteAnnouncementResponse>
