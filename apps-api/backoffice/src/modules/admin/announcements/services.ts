import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { FilePath } from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { err } from '@pple-today/api-common/utils'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  GetAnnouncementByIdResponse,
  GetAnnouncementsQuery,
  GetAnnouncementsResponse,
  PostAnnouncementBody,
  UpdateAnnouncementBody,
} from './models'
import { AdminAnnouncementRepository, AdminAnnouncementRepositoryPlugin } from './repository'

import { FileServicePlugin } from '../../../plugins/file'

export class AdminAnnouncementService {
  constructor(
    private readonly adminAnnouncementRepository: AdminAnnouncementRepository,
    private readonly fileService: FileService
  ) {}

  async getAnnouncements(query: GetAnnouncementsQuery = { limit: 10, page: 1 }) {
    const result = await this.adminAnnouncementRepository.getAnnouncements(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    return ok(result.value satisfies GetAnnouncementsResponse)
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
    } satisfies GetAnnouncementByIdResponse)
  }

  async createAnnouncement(data: PostAnnouncementBody) {
    const createResult = await this.adminAnnouncementRepository.createAnnouncement(data)

    if (createResult.isErr()) return mapRepositoryError(createResult.error)

    return ok({ announcementId: createResult.value.id })
  }

  async updateAnnouncementById(announcementId: string, data: UpdateAnnouncementBody) {
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

  async deleteAnnouncementById(announcementId: string) {
    const result = await this.adminAnnouncementRepository.deleteAnnouncementById(announcementId)
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
