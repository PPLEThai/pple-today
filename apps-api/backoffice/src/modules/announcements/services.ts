import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import { GetAnnouncementByIdResponse, ListAnnouncementsResponse } from './models'
import { AnnouncementRepository, AnnouncementRepositoryPlugin } from './repository'

import { FileServicePlugin } from '../../plugins/file'

// TODO: Filter by announcement type corresponding to the user role
export class AnnouncementService {
  constructor(
    private readonly announcementRepository: AnnouncementRepository,
    private fileService: FileService
  ) {}

  async listAnnouncements(query?: { limit: number; cursor?: string }) {
    const announcementResult = await this.announcementRepository.listAnnouncements({
      limit: query?.limit ?? 10,
      cursor: query?.cursor,
    })

    if (announcementResult.isErr()) {
      return mapRepositoryError(announcementResult.error)
    }

    return ok({
      announcements: announcementResult.value.map((announcement) => ({
        id: announcement.feedItemId,
        title: announcement.title,
        content: announcement.content ?? '',
        createdAt: announcement.feedItem.createdAt,
        updatedAt: announcement.feedItem.updatedAt,
      })),
    } satisfies ListAnnouncementsResponse)
  }

  async listAnnouncementByTopicId(topicId: string, query?: { limit: number; cursor?: string }) {
    const announcementResult = await this.announcementRepository.listAnnouncementByTopicId(
      topicId,
      query
    )

    if (announcementResult.isErr()) {
      return mapRepositoryError(announcementResult.error)
    }

    return ok({
      announcements: announcementResult.value.map((announcement) => ({
        id: announcement.feedItemId,
        title: announcement.title,
        content: announcement.content ?? '',
        backgroundColor: announcement.backgroundColor ?? '',
        createdAt: announcement.feedItem.createdAt,
        updatedAt: announcement.feedItem.updatedAt,
      })),
    } satisfies ListAnnouncementsResponse)
  }

  async listAnnouncementByHashTagId(hashTagId: string, query?: { limit: number; cursor?: string }) {
    const announcementResult = await this.announcementRepository.listAnnouncementByHashTagId(
      hashTagId,
      query
    )

    if (announcementResult.isErr()) {
      return mapRepositoryError(announcementResult.error)
    }

    return ok({
      announcements: announcementResult.value.map((announcement) => ({
        id: announcement.feedItemId,
        title: announcement.title,
        content: announcement.content ?? '',
        backgroundColor: announcement.backgroundColor ?? '',
        createdAt: announcement.feedItem.createdAt,
        updatedAt: announcement.feedItem.updatedAt,
      })),
    } satisfies ListAnnouncementsResponse)
  }

  async listFollowedAnnouncements(userId: string, query?: { limit: number; cursor?: string }) {
    const announcementResult = await this.announcementRepository.listFollowedAnnouncements(
      userId,
      query
    )

    if (announcementResult.isErr()) {
      return mapRepositoryError(announcementResult.error)
    }

    return ok({
      announcements: announcementResult.value.map((announcement) => ({
        id: announcement.feedItemId,
        title: announcement.title,
        content: announcement.content ?? '',
        backgroundColor: announcement.backgroundColor ?? '',
        createdAt: announcement.feedItem.createdAt,
        updatedAt: announcement.feedItem.updatedAt,
      })),
    } satisfies ListAnnouncementsResponse)
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

    const attachmentPublicUrls = this.fileService.bulkGetPublicFileUrl(
      announcementResult.value.attachments.map((attachment) => attachment.filePath)
    )

    return ok({
      id: announcementResult.value.feedItemId,
      title: announcementResult.value.title,
      content: announcementResult.value.content ?? '',
      attachments: attachmentPublicUrls,
      createdAt: announcementResult.value.feedItem.createdAt,
      updatedAt: announcementResult.value.feedItem.updatedAt,
      feedItemId: announcementResult.value.feedItemId,
    } satisfies GetAnnouncementByIdResponse)
  }
}

export const AnnouncementServicePlugin = new Elysia({
  name: 'AnnouncementService',
})
  .use([AnnouncementRepositoryPlugin, FileServicePlugin])
  .decorate(({ announcementRepository, fileService }) => ({
    announcementService: new AnnouncementService(announcementRepository, fileService),
  }))
