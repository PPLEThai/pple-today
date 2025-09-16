import { DraftAnnouncement, PublishedAnnouncement } from '@pple-today/api-common/dtos'
import { FilePath } from '@pple-today/api-common/dtos'
import { AnnouncementType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const AnnouncementIdParams = t.Object({
  announcementId: t.String({ description: 'The ID of the published/draft announcement' }),
})

export const GetAnnouncementsQuery = t.Object({
  type: t.Optional(
    t.Union(
      [
        t.Literal('publish', { description: 'String `publish`' }),
        t.Literal('draft', { description: 'String `draft`' }),
      ],
      {
        description: 'Type of announcement',
      }
    )
  ),
  limit: t.Optional(t.Number({ default: 10 })),
  page: t.Optional(t.Number({ default: 1 })),
})
export type GetAnnouncementsQuery = Static<typeof GetAnnouncementsQuery>

export const GetAnnouncementsResponse = t.Array(
  t.Union([
    t.Pick(DraftAnnouncement, [
      'id',
      'content',
      'createdAt',
      'updatedAt',
      'topics',
      'title',
      'type',
    ]),
    t.Pick(PublishedAnnouncement, [
      'id',
      'content',
      'createdAt',
      'updatedAt',
      'topics',
      'title',
      'type',
    ]),
  ])
)
export type GetAnnouncementsResponse = Static<typeof GetAnnouncementsResponse>

export const GetPublishedAnnouncementsResponse = t.Array(
  t.Pick(PublishedAnnouncement, [
    'id',
    'content',
    'createdAt',
    'updatedAt',
    'topics',
    'title',
    'type',
  ])
)
export type GetPublishedAnnouncementsResponse = Static<typeof GetPublishedAnnouncementsResponse>

export const GetPublishedAnnouncementResponse = PublishedAnnouncement
export type GetPublishedAnnouncementResponse = Static<typeof GetPublishedAnnouncementResponse>

export const PutPublishedAnnouncementBody = t.Object({
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
export type PutPublishedAnnouncementBody = Static<typeof PutPublishedAnnouncementBody>

export const PutPublishedAnnouncementResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type PutPublishedAnnouncementResponse = Static<typeof PutPublishedAnnouncementResponse>

export const PublishedAnnouncementUnpublishedResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type PublishedAnnouncementUnpublishedResponse = Static<
  typeof PublishedAnnouncementUnpublishedResponse
>

export const DeletePublishedAnnouncementResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeletePublishedAnnouncementResponse = Static<typeof DeletePublishedAnnouncementResponse>

export const GetDraftAnnouncementsResponse = t.Array(
  t.Pick(DraftAnnouncement, ['id', 'content', 'createdAt', 'updatedAt', 'topics', 'title', 'type'])
)
export type GetDraftAnnouncementsResponse = Static<typeof GetDraftAnnouncementsResponse>

export const GetDraftAnnouncementResponse = DraftAnnouncement
export type GetDraftAnnouncementResponse = Static<typeof GetDraftAnnouncementResponse>

export const PostDraftAnnouncementResponse = t.Object({
  announcementId: t.String({ description: 'The ID of the announcement' }),
})
export type PostDraftAnnouncementResponse = Static<typeof PostDraftAnnouncementResponse>

export const PutDraftAnnouncementBody = t.Object({
  title: t.Nullable(t.String({ description: 'The title of the announcement' })),
  content: t.Nullable(t.String({ description: 'The content of the announcement' })),
  type: t.Nullable(t.Enum(AnnouncementType, { description: 'The type of the announcement' })),
  topicIds: t.Array(t.String({ description: 'The ID of the announcement topic' })),
  attachmentFilePaths: t.Array(FilePath),
})
export type PutDraftAnnouncementBody = Static<typeof PutDraftAnnouncementBody>

export const PutDraftAnnouncementResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type PutDraftAnnouncementResponse = Static<typeof PutDraftAnnouncementResponse>

export const DraftAnnouncementPublishedResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DraftAnnouncementPublishedResponse = Static<typeof DraftAnnouncementPublishedResponse>

export const DeleteDraftAnnouncementResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeleteDraftAnnouncementResponse = Static<typeof DeleteDraftAnnouncementResponse>
