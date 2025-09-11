import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { Prisma } from '@pple-today/database/prisma'
import { Elysia } from 'elysia'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class AnnouncementRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private queryAnnouncements(query: {
    limit: number
    cursor?: string
    where?: Prisma.AnnouncementFindManyArgs['where']
  }) {
    const { limit, cursor } = query

    return fromRepositoryPromise(
      this.prismaService.announcement.findMany({
        where: query.where,
        select: {
          feedItemId: true,
          title: true,
          content: true,
          backgroundColor: true,
          attachments: true,
          feedItem: {
            select: {
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        take: limit,
        cursor: cursor ? { feedItemId: cursor } : undefined,
        skip: cursor ? 1 : 0,
        orderBy: {
          feedItem: {
            createdAt: 'desc',
          },
        },
      })
    )
  }

  async listAnnouncements(query: { limit: number; cursor?: string }) {
    const { limit, cursor } = query

    return await this.queryAnnouncements({
      limit,
      cursor,
    })
  }

  async listFollowedAnnouncements(
    userId: string,
    query: { limit: number; cursor?: string } = {
      limit: 10,
    }
  ) {
    const { limit, cursor } = query

    return await this.queryAnnouncements({
      limit,
      cursor,
      where: {
        topics: {
          some: {
            topic: {
              followedTopics: {
                some: {
                  userId,
                },
              },
            },
          },
        },
      },
    })
  }

  async listAnnouncementByTopicId(
    topicId: string,
    query: { limit: number; cursor?: string } = { limit: 10 }
  ) {
    const { limit, cursor } = query

    return await this.queryAnnouncements({
      limit,
      cursor,
      where: {
        topics: {
          some: {
            topicId,
          },
        },
      },
    })
  }

  async listAnnouncementByHashTagId(
    hashTagId: string,
    query: { limit: number; cursor?: string } = { limit: 10 }
  ) {
    const { limit, cursor } = query

    return await this.queryAnnouncements({
      limit,
      cursor,
      where: {
        topics: {
          some: {
            topic: {
              hashTagInTopics: {
                some: {
                  hashTagId,
                },
              },
            },
          },
        },
      },
    })
  }

  async getAnnouncementById(id: string) {
    return await fromRepositoryPromise(
      this.prismaService.announcement.findUnique({
        where: { feedItemId: id },
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
