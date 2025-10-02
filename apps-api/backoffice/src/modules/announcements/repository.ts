import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { AnnouncementStatus } from '@pple-today/database/prisma'
import { Elysia } from 'elysia'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class AnnouncementRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getAnnouncements(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const { limit, page } = query
    const skip = page ? (page - 1) * limit : 0

    return await fromRepositoryPromise(
      this.prismaService.announcement.findMany({
        where: {
          status: AnnouncementStatus.PUBLISHED,
        },
        select: {
          feedItemId: true,
          title: true,
          content: true,
          type: true,
          attachments: true,
          feedItem: {
            select: {
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        take: limit,
        skip,
        orderBy: {
          feedItem: {
            createdAt: 'desc',
          },
        },
      })
    )
  }

  async getAnnouncementById(id: string) {
    return await fromRepositoryPromise(
      this.prismaService.announcement.findUnique({
        where: { feedItemId: id, status: AnnouncementStatus.PUBLISHED },
        include: {
          attachments: true,
          feedItem: {
            select: {
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      })
    )
  }
}

export const AnnouncementRepositoryPlugin = new Elysia({
  name: 'AnnouncementRepository',
})
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    announcementRepository: new AnnouncementRepository(prismaService),
  }))
