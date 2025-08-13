import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  GetAnnouncementsResponse,
  GetDraftAnnouncementResponse,
  GetDraftAnnouncementsResponse,
  GetPublishedAnnouncementResponse,
  GetPublishedAnnouncementsResponse,
  PutDraftAnnouncementBody,
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

  private async cleanUpUnusedAttachment(before: string[], after: string[]) {
    const unusedAttachments = before.filter((filePath) => !after.includes(filePath))

    if (unusedAttachments.length > 0) {
      const deleteResult = await this.fileService.bulkDeleteFile(unusedAttachments)
      if (deleteResult.isErr()) {
        return err(deleteResult.error)
      }
    }

    return ok(true)
  }

  async getAnnouncements() {
    const result = await this.adminAnnouncementRepository.getAllAnnouncements()

    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok(
      result.value.map((announcement): GetAnnouncementsResponse[number] => ({
        ...announcement,
        topics: announcement.topics.map(({ topic }) => topic),
      }))
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

    const value: GetPublishedAnnouncementsResponse = result.value

    return ok(value)
  }

  async getAnnouncementById(announcementId: string) {
    const result = await this.adminAnnouncementRepository.getAnnouncementById(announcementId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    const attachmentUrls = await this.fileService.bulkGetFileSignedUrl(result.value.attachments)

    if (attachmentUrls.isErr()) {
      return err(attachmentUrls.error)
    }

    return ok({
      ...result.value,
      attachments: result.value.attachments.map((filePath, index) => ({
        url: attachmentUrls.value[index],
        filePath,
      })),
    } satisfies GetPublishedAnnouncementResponse)
  }

  // TODO: Transactional file handling
  async updateAnnouncementById(announcementId: string, data: PutPublishedAnnouncementBody) {
    const announcementResult =
      await this.adminAnnouncementRepository.getAnnouncementById(announcementId)

    if (announcementResult.isErr())
      return mapRawPrismaError(announcementResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    const cleanUpResult = await this.cleanUpUnusedAttachment(
      announcementResult.value.attachments,
      data.attachmentFilePaths
    )

    if (cleanUpResult.isErr()) {
      return err(cleanUpResult.error)
    }

    const updatedAttachmentsResult = await this.fileService.moveFileToPublicFolder(
      data.attachmentFilePaths
    )

    if (updatedAttachmentsResult.isErr()) {
      return err({
        code: InternalErrorCode.FILE_MOVE_ERROR,
        message: 'Failed to move one or more files',
      })
    }

    const updateResult = await this.adminAnnouncementRepository.updateAnnouncementById(
      announcementId,
      {
        ...data,
        attachmentFilePaths: updatedAttachmentsResult.value,
      }
    )

    if (updateResult.isErr())
      return mapRawPrismaError(updateResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    const markAsPublicResult = await this.fileService.bulkMarkAsPublic(
      updatedAttachmentsResult.value
    )

    if (markAsPublicResult.isErr()) {
      return err(markAsPublicResult.error)
    }

    return ok({ message: `Announcement "${updateResult.value.feedItemId}" updated.` })
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

    const deleteResult = await this.fileService.bulkDeleteFile(
      result.value.announcement?.attachments.map((attachment) => attachment.filePath) ?? []
    )

    if (deleteResult.isErr()) {
      return err(deleteResult.error)
    }

    return ok({ message: `Announcement "${result.value.id}" deleted.` })
  }

  async getDraftAnnouncements(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const result = await this.adminAnnouncementRepository.getDraftAnnouncements(query)
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok(result.value satisfies GetDraftAnnouncementsResponse)
  }

  async getDraftAnnouncementById(announcementId: string) {
    const result = await this.adminAnnouncementRepository.getDraftAnnouncementById(announcementId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    const attachmentUrls = await this.fileService.bulkGetFileSignedUrl(result.value.attachments)

    if (attachmentUrls.isErr()) {
      return err(attachmentUrls.error)
    }

    return ok({
      ...result.value,
      attachments: result.value.attachments.map((filePath, index) => ({
        url: attachmentUrls.value[index],
        filePath: filePath,
      })),
    } satisfies GetDraftAnnouncementResponse)
  }

  async createEmptyDraftAnnouncement() {
    const result = await this.adminAnnouncementRepository.createEmptyDraftAnnouncement()
    if (result.isErr()) return mapRawPrismaError(result.error)

    return ok({ announcementId: result.value.id })
  }

  async updateDraftAnnouncementById(announcementId: string, data: PutDraftAnnouncementBody) {
    const draftAnnouncement =
      await this.adminAnnouncementRepository.getDraftAnnouncementById(announcementId)

    if (draftAnnouncement.isErr()) {
      return mapRawPrismaError(draftAnnouncement.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })
    }

    const cleanUpResult = await this.cleanUpUnusedAttachment(
      draftAnnouncement.value.attachments,
      data.attachmentFilePaths
    )

    if (cleanUpResult.isErr()) {
      return err(cleanUpResult.error)
    }

    const draftAnnouncementAttachments = await this.fileService.moveFileToPublicFolder(
      data.attachmentFilePaths
    )

    if (draftAnnouncementAttachments.isErr()) {
      return err({
        code: InternalErrorCode.FILE_MOVE_ERROR,
        message: 'Failed to move one or more files',
      })
    }

    const result = await this.adminAnnouncementRepository.updateDraftAnnouncementById(
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

    return ok({ message: `Draft Announcement "${result.value.id}" updated.` })
  }

  async publishDraftAnnouncementById(announcementId: string, authorId: string) {
    const draftAnnouncementResult =
      await this.adminAnnouncementRepository.getDraftAnnouncementById(announcementId)

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
        message: 'Draft announcement is missing required fields: title, type',
      })
    }

    const attachments = await this.fileService.moveFileToPublicFolder(draftAnnouncement.attachments)

    if (attachments.isErr()) {
      return err({
        code: InternalErrorCode.FILE_MOVE_ERROR,
        message: 'Failed to move one or more files',
      })
    }

    const result = await this.adminAnnouncementRepository.publishDraftAnnouncementById(
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

    return ok({ message: `Draft Announcement "${result.value.id}" published.` })
  }

  async deleteDraftAnnouncement(announcementId: string) {
    const result =
      await this.adminAnnouncementRepository.deleteDraftAnnouncementById(announcementId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    const deleteResult = await this.fileService.bulkDeleteFile(
      result.value.attachments.map((attachment) => attachment.filePath)
    )

    if (deleteResult.isErr()) {
      return err(deleteResult.error)
    }

    return ok({ message: `Draft Announcement "${result.value.id}" deleted.` })
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
