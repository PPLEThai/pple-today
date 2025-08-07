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
import { mapRawPrismaError } from '../../../utils/prisma'

export class AdminAnnouncementService {
  constructor(private adminAnnouncementRepository: AdminAnnouncementRepository) {}

  async getAnnouncements() {
    const result = await this.adminAnnouncementRepository.getAllAnnouncements()
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok(result.value satisfies GetAnnouncementsResponse)
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

    return ok(result.value satisfies GetPublishedAnnouncementResponse)
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
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok({ announcementId: result.value.id })
  }

  async updateDraftedAnnouncementById(announcementId: string, data: PutDraftedAnnouncementBody) {
    const result = await this.adminAnnouncementRepository.updateDraftedAnnouncementById(
      announcementId,
      data
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
    const result = await this.adminAnnouncementRepository.publishDraftedAnnouncementById(
      announcementId,
      authorId
    )
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
        },
      })

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
  .use(AdminAnnouncementRepositoryPlugin)
  .decorate(({ adminAnnouncementRepository }) => ({
    adminAnnouncementService: new AdminAnnouncementService(adminAnnouncementRepository),
  }))
