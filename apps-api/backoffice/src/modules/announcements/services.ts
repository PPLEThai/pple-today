import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import { GetAnnouncementByIdResponse, GetAnnouncementsResponse } from './models'
import { AnnouncementRepository, AnnouncementRepositoryPlugin } from './repository'

import { FileServerService, FileServerServicePlugin } from '../files/services'

export class AnnouncementService {
  constructor(
    private readonly announcementRepository: AnnouncementRepository,
    private readonly fileServerService: FileServerService
  ) {}

  async getAnnouncements(query?: { limit: number; page: number }) {
    // TODO: Filter by announcement type corresponding to the user role
    const announcementResult = await this.announcementRepository.getAnnouncements(query)

    if (announcementResult.isErr()) {
      return mapRepositoryError(announcementResult.error)
    }

    return ok({
      announcements: announcementResult.value.map((announcement) => ({
        id: announcement.feedItemId,
        title: announcement.title,
        content: announcement.content ?? '',
        type: announcement.type,
        publishedAt: announcement.feedItem.publishedAt!,
      })),
    } satisfies GetAnnouncementsResponse)
  }

  async getAnnouncementById(id: string) {
    // TODO: Filter by announcement type corresponding to the user role
    const announcementResult = await this.announcementRepository.getAnnouncementById(id)

    if (announcementResult.isErr()) {
      return mapRepositoryError(announcementResult.error)
    }

    if (!announcementResult.value) {
      return err({
        code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        message: 'Announcement not found',
      })
    }

    const attachmentPublicUrls = this.fileServerService.bulkGetFileEndpointUrl(
      announcementResult.value.attachments.map((attachment) => attachment.filePath)
    )

    return ok({
      id: announcementResult.value.feedItemId,
      title: announcementResult.value.title,
      content: announcementResult.value.content ?? '',
      attachments: attachmentPublicUrls,
      type: announcementResult.value.type,
      publishedAt: announcementResult.value.feedItem.publishedAt!,
      feedItemId: announcementResult.value.feedItemId,
    } satisfies GetAnnouncementByIdResponse)
  }
}

export const AnnouncementServicePlugin = new Elysia({
  name: 'AnnouncementService',
})
  .use([AnnouncementRepositoryPlugin, FileServerServicePlugin])
  .decorate(({ announcementRepository, fileServerService }) => ({
    announcementService: new AnnouncementService(announcementRepository, fileServerService),
  }))
