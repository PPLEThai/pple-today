import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { FilePath } from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { err } from '@pple-today/api-common/utils'
import { mapRepositoryError } from '@pple-today/api-common/utils'
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

import { FileServicePlugin } from '../../../plugins/file'

export class AdminAnnouncementService {
  constructor(
    private readonly adminAnnouncementRepository: AdminAnnouncementRepository,
    private readonly fileService: FileService
  ) {}

  async getAnnouncements() {
    const result = await this.adminAnnouncementRepository.getAllAnnouncements()
    if (result.isErr()) return mapRepositoryError(result.error)

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
    if (result.isErr()) return mapRepositoryError(result.error)

    const value: GetPublishedAnnouncementsResponse = result.value

    return ok(value)
  }

  async getAnnouncementById(announcementId: string) {
    const result = await this.adminAnnouncementRepository.getAnnouncementById(announcementId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
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
        filePath: filePath as FilePath,
      })),
    } satisfies GetPublishedAnnouncementResponse)
  }

  async updateAnnouncementById(announcementId: string, data: PutPublishedAnnouncementBody) {
    const updateResult = await this.adminAnnouncementRepository.updateAnnouncementById(
      announcementId,
      data
    )

    if (updateResult.isErr())
      return mapRepositoryError(updateResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    return ok({ message: `Announcement "${updateResult.value.feedItemId}" updated.` })
  }

  async unpublishAnnouncementById(announcementId: string) {
    const result = await this.adminAnnouncementRepository.unpublishAnnouncementById(announcementId)

    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    return ok({ message: `Announcement "${result.value.id}" unpublished.` })
  }

  async deleteAnnouncementById(announcementId: string) {
    const result = await this.adminAnnouncementRepository.deleteAnnouncementById(announcementId)

    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    return ok({ message: `Announcement "${result.value.id}" deleted.` })
  }

  async getDraftAnnouncements(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const result = await this.adminAnnouncementRepository.getDraftAnnouncements(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    const draftAnnouncements: GetDraftAnnouncementsResponse = result.value.map((draft) => ({
      id: draft.id,
      title: draft.title,
      content: draft.content,
      type: draft.type,
      iconImage: draft.iconImage,
      backgroundColor: draft.backgroundColor,
      topics: draft.topics,
      attachments: draft.attachments.map((filePath) => ({
        url: this.fileService.getPublicFileUrl(filePath),
        filePath,
      })),
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    }))

    return ok(draftAnnouncements)
  }

  async getDraftAnnouncementById(announcementId: string) {
    const result = await this.adminAnnouncementRepository.getDraftAnnouncementById(announcementId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
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
        filePath: filePath as FilePath,
      })),
    } satisfies GetDraftAnnouncementResponse)
  }

  async createEmptyDraftAnnouncement() {
    const result = await this.adminAnnouncementRepository.createEmptyDraftAnnouncement()
    if (result.isErr()) return mapRepositoryError(result.error)

    return ok({ announcementId: result.value.id })
  }

  async updateDraftAnnouncementById(announcementId: string, data: PutDraftAnnouncementBody) {
    const result = await this.adminAnnouncementRepository.updateDraftAnnouncementById(
      announcementId,
      data
    )

    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    return ok({ message: `Draft Announcement "${result.value.id}" updated.` })
  }

  async publishDraftAnnouncementById(announcementId: string, authorId: string) {
    const result = await this.adminAnnouncementRepository.publishDraftAnnouncementById(
      announcementId,
      authorId
    )

    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

    return ok({ message: `Draft Announcement "${result.value.id}" published.` })
  }

  async deleteDraftAnnouncement(announcementId: string) {
    const result =
      await this.adminAnnouncementRepository.deleteDraftAnnouncementById(announcementId)

    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

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
