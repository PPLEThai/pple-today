import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import { GetAnnouncementByIdResponse, GetAnnouncementsResponse } from './models'
import { AnnouncementRepository, AnnouncementRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../dtos/error'
import { mapRawPrismaError } from '../../utils/prisma'

export class AnnouncementService {
  constructor(private readonly announcementRepository: AnnouncementRepository) {}

  async getAnnouncements(query?: { limit: number; page: number }) {
    // TODO: Filter by announcement type corresponding to the user role
    const announcementResult = await this.announcementRepository.getAnnouncements(query)

    if (announcementResult.isErr()) {
      return mapRawPrismaError(announcementResult.error)
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
    } satisfies GetAnnouncementsResponse)
  }

  async getAnnouncementById(id: string) {
    // TODO: Filter by announcement type corresponding to the user role
    const announcementResult = await this.announcementRepository.getAnnouncementById(id)

    if (announcementResult.isErr()) {
      return mapRawPrismaError(announcementResult.error)
    }

    if (!announcementResult.value) {
      return err({
        code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        message: 'Announcement not found',
      })
    }

    return ok({
      id: announcementResult.value.feedItemId,
      title: announcementResult.value.title,
      content: announcementResult.value.content ?? '',
      backgroundColor: announcementResult.value.backgroundColor ?? '',
      attachments: announcementResult.value.attachments.map((attachment) => attachment.url),
      createdAt: announcementResult.value.feedItem.createdAt,
      updatedAt: announcementResult.value.feedItem.updatedAt,
    } satisfies GetAnnouncementByIdResponse)
  }
}

export const AnnouncementServicePlugin = new Elysia({
  name: 'AnnouncementService',
})
  .use(AnnouncementRepositoryPlugin)
  .decorate(({ announcementRepository }) => ({
    announcementService: new AnnouncementService(announcementRepository),
  }))
