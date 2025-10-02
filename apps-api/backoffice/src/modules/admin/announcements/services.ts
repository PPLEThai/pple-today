import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { FilePath } from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { err } from '@pple-today/api-common/utils'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetAnnouncementResponse, GetAnnouncementsResponse, PutAnnouncementBody } from './models'
import { AdminAnnouncementRepository, AdminAnnouncementRepositoryPlugin } from './repository'

import { FileServicePlugin } from '../../../plugins/file'

export class AdminAnnouncementService {
  constructor(
    private readonly adminAnnouncementRepository: AdminAnnouncementRepository,
    private readonly fileService: FileService
  ) {}

  async getAnnouncements(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const result = await this.adminAnnouncementRepository.getAnnouncements(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    const value: GetAnnouncementsResponse = result.value

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
    } satisfies GetAnnouncementResponse)
  }

  async updateAnnouncementById(announcementId: string, data: PutAnnouncementBody) {
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
