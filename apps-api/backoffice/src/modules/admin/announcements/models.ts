import { Static, t } from 'elysia'

import { AnnouncementType } from '../../../../__generated__/prisma'
import { DraftedAnnouncement, PublishedAnnouncement } from '../../../dtos/announcement'

export const AnnouncementIdParams = t.Object({
  announcementId: t.String({ description: 'The ID of the published/drafted announcement' }),
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
  t.Union([DraftedAnnouncement, PublishedAnnouncement])
)
export type GetAnnouncementsResponse = Static<typeof GetAnnouncementsResponse>

export const GetPublishedAnnouncementsResponse = t.Array(PublishedAnnouncement)
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
  attachmentUrls: t.Array(t.String({ description: 'The URL of the announcement attachment' })),
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

export const GetDraftedAnnouncementsResponse = t.Array(DraftedAnnouncement)
export type GetDraftedAnnouncementsResponse = Static<typeof GetDraftedAnnouncementsResponse>

export const GetDraftedAnnouncementResponse = DraftedAnnouncement
export type GetDraftedAnnouncementResponse = Static<typeof GetDraftedAnnouncementResponse>

export const PostDraftedAnnouncementResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type PostDraftedAnnouncementResponse = Static<typeof PostDraftedAnnouncementResponse>

export const PutDraftedAnnouncementBody = t.Object({
  title: t.Nullable(t.String({ description: 'The title of the announcement' })),
  content: t.Nullable(t.String({ description: 'The content of the announcement' })),
  type: t.Nullable(t.Enum(AnnouncementType, { description: 'The type of the announcement' })),
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
  attachmentUrls: t.Array(t.String({ description: 'The URL of the announcement attachment' })),
})
export type PutDraftedAnnouncementBody = Static<typeof PutDraftedAnnouncementBody>

export const PutDraftedAnnouncementResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type PutDraftedAnnouncementResponse = Static<typeof PutDraftedAnnouncementResponse>

export const DraftedAnnouncementPublishedResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DraftedAnnouncementPublishedResponse = Static<
  typeof DraftedAnnouncementPublishedResponse
>

export const DeleteDraftedAnnouncementResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeleteDraftedAnnouncementResponse = Static<typeof DeleteDraftedAnnouncementResponse>
