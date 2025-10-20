import { Announcement, DetailedAnnouncement } from '@pple-today/api-common/dtos'
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
  data: t.Array(Announcement),
  meta: t.Object({ count: t.Number() }),
})
export type GetAnnouncementsResponse = Static<typeof GetAnnouncementsResponse>

export const GetAnnouncementByIdParams = AnnouncementIdParams
export type GetAnnouncementByIdParams = Static<typeof GetAnnouncementByIdParams>

export const GetAnnouncementByIdResponse = DetailedAnnouncement
export type GetAnnouncementByIdResponse = Static<typeof GetAnnouncementByIdResponse>

export const CreateAnnouncementBody = t.Object({
  title: t.String({ description: 'The title of the announcement' }),
  type: t.Enum(AnnouncementType, { description: 'The type of the announcement' }),
  content: t.String({ description: 'The content of the announcement' }),
  attachmentFilePaths: t.Array(FilePath),
})

export type CreateAnnouncementBody = Static<typeof CreateAnnouncementBody>
export const CreateAnnouncementResponse = t.Object({
  announcementId: t.String({ description: 'The ID of the announcement' }),
})
export type CreateAnnouncementResponse = Static<typeof CreateAnnouncementResponse>

export const UpdateAnnouncementParams = AnnouncementIdParams
export type UpdateAnnouncementParams = Static<typeof UpdateAnnouncementParams>

export const UpdateAnnouncementBody = t.Partial(
  t.Object({
    title: t.String({ description: 'The title of the announcement' }),
    type: t.Enum(AnnouncementType, { description: 'The type of the announcement' }),
    content: t.Nullable(t.String({ description: 'The content of the announcement' })),
    attachmentFilePaths: t.Array(FilePath),
    status: t.Enum(AnnouncementStatus, { description: 'The status of the announcement' }),
  })
)
export type UpdateAnnouncementBody = Static<typeof UpdateAnnouncementBody>

export const UpdateAnnouncementResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type UpdateAnnouncementResponse = Static<typeof UpdateAnnouncementResponse>

export const DeleteAnnouncementParams = AnnouncementIdParams
export type DeleteAnnouncementParams = Static<typeof DeleteAnnouncementParams>

export const DeleteAnnouncementResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type DeleteAnnouncementResponse = Static<typeof DeleteAnnouncementResponse>
