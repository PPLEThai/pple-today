import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  GetAnnouncementsResponse,
  GetDraftedAnnouncementResponse,
  GetDraftedAnnouncementsResponse,
  GetPublishedAnnouncementResponse,
  GetPublishedAnnouncementsResponse,
  PutDraftedAnnouncementBody,
  PutPublishedAnnouncementBody,
} from './models'
import { AdminAnnouncementRepository, AdminAnnouncementRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../../dtos/error'
import { err } from '../../../utils/error'
import { mapRawPrismaError } from '../../../utils/prisma'
import { FileService, FileServicePlugin } from '../../file/services'

export class AdminAnnouncementService {
  constructor(
    private adminAnnouncementRepository: AdminAnnouncementRepository,
    private fileService: FileService
  ) {}

  async getAnnouncements() {
    const result = await this.adminAnnouncementRepository.getAllAnnouncements()
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok(
      result.value.map((announcement) => ({
        ...announcement,
        topics: announcement.topics.map(({ topic }) => topic),
      })) satisfies GetAnnouncementsResponse
    )
  }

  async getPublishedAnnouncements(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const result = await this.adminAnnouncementRepository.getAnnouncements(query)
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok(result.value satisfies GetPublishedAnnouncementsResponse)
  }

  async getAnnouncementById(announcementId: string) {
    const result = await this.adminAnnouncementRepository.getAnnouncementById(announcementId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    const attachmentUrls = await this.fileService.batchGetFileSignedUrl(result.value.attachments)

    if (attachmentUrls.isErr()) {
      return err(attachmentUrls.error)
    }

    return ok({
      ...result.value,
      attachments: attachmentUrls.value,
    } satisfies GetPublishedAnnouncementResponse)
  }

  async updateAnnouncementById(announcementId: string, data: PutPublishedAnnouncementBody) {
    const result = await this.adminAnnouncementRepository.updateAnnouncementById(
      announcementId,
      data
    )
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    return ok({ message: `Announcement "${result.value.feedItemId}" updated.` })
  }

  async unpublishAnnouncementById(announcementId: string) {
    const result = await this.adminAnnouncementRepository.unpublishAnnouncementById(announcementId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    const markAsPrivateResult = await this.fileService.bulkMarkAsPrivate(
      result.value.attachments.map((attachment) => attachment.filePath)
    )

    if (markAsPrivateResult.isErr()) {
      return err(markAsPrivateResult.error)
    }

    return ok({ message: `Announcement "${result.value.id}" unpublished.` })
  }

  async deleteAnnouncementById(announcementId: string) {
    const result = await this.adminAnnouncementRepository.deleteAnnouncementById(announcementId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    return ok({ message: `Announcement "${result.value.id}" deleted.` })
  }

  async getDraftedAnnouncements(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const result = await this.adminAnnouncementRepository.getDraftedAnnouncements(query)
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok(result.value satisfies GetDraftedAnnouncementsResponse)
  }

  async getDraftedAnnouncementById(announcementId: string) {
    const result = await this.adminAnnouncementRepository.getDraftedAnnouncementById(announcementId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetDraftedAnnouncementResponse)
  }

  async createEmptyDraftedAnnouncement() {
    const result = await this.adminAnnouncementRepository.createEmptyDraftedAnnouncement()
    if (result.isErr()) return mapRawPrismaError(result.error)

    return ok({ announcementId: result.value.id })
  }

  async updateDraftedAnnouncementById(announcementId: string, data: PutDraftedAnnouncementBody) {
    const draftAnnouncementAttachments = await this.fileService.moveFileToPublicFolder(
      data.attachmentFilePaths
    )

    if (draftAnnouncementAttachments.isErr()) {
      return err({
        code: InternalErrorCode.FILE_MOVE_ERROR,
        message: 'Failed to move one or more files',
      })
    }

    const result = await this.adminAnnouncementRepository.updateDraftedAnnouncementById(
      announcementId,
      {
        ...data,
        attachmentFilePaths: draftAnnouncementAttachments.value,
      }
    )

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    return ok({ message: `Drafted Announcement "${result.value.id}" updated.` })
  }

  async publishDraftedAnnouncementById(announcementId: string, authorId: string) {
    const draftAnnouncementResult =
      await this.adminAnnouncementRepository.getDraftedAnnouncementById(announcementId)

    if (draftAnnouncementResult.isErr()) {
      return mapRawPrismaError(draftAnnouncementResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })
    }

    const draftAnnouncement = draftAnnouncementResult.value

    if (!draftAnnouncement.title || !draftAnnouncement.type) {
      return err({
        code: InternalErrorCode.ANNOUNCEMENT_INVALID_DRAFT,
        message: 'Drafted announcement is missing required fields: title, type',
      })
    }

    const attachments = await this.fileService.moveFileToPublicFolder(draftAnnouncement.attachments)

    if (attachments.isErr()) {
      return err({
        code: InternalErrorCode.FILE_MOVE_ERROR,
        message: 'Failed to move one or more files',
      })
    }

    const result = await this.adminAnnouncementRepository.publishDraftedAnnouncementById(
      {
        id: draftAnnouncement.id,
        title: draftAnnouncement.title,
        content: draftAnnouncement.content,
        type: draftAnnouncement.type,
        iconImage: draftAnnouncement.iconImage,
        backgroundColor: draftAnnouncement.backgroundColor,
        attachments: attachments.value,
        topics: draftAnnouncement.topics.map((topic) => topic.id),
      },
      authorId
    )

    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    const markPublicResult = await this.fileService.bulkMarkAsPublic(attachments.value)

    if (markPublicResult.isErr()) {
      return err(markPublicResult.error)
    }

    return ok({ message: `Drafted Announcement "${result.value.id}" published.` })
  }

  async deleteDraftedAnnouncement(announcementId: string) {
    const result =
      await this.adminAnnouncementRepository.deleteDraftedAnnouncementById(announcementId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    return ok({ message: `Drafted Announcement "${result.value.id}" deleted.` })
  }
}

export const AdminAnnouncementServicePlugin = new Elysia({
  name: 'AdminAnnouncementService',
})
  .use([AdminAnnouncementRepositoryPlugin, FileServicePlugin])
  .decorate(({ adminAnnouncementRepository, fileService }) => ({
    adminAnnouncementService: new AdminAnnouncementService(
      adminAnnouncementRepository,
      fileService
    ),
  }))
