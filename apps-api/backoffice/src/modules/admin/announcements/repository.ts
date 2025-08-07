import Elysia from 'elysia'

import { PutDraftedAnnouncementBody, PutPublishedAnnouncementBody } from './models'

import { FeedItemType } from '../../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'
import { FileService, FileServicePlugin } from '../../file/services'

export class AdminAnnouncementRepository {
  constructor(
    private prismaService: PrismaService,
    private fileService: FileService
  ) {}

  async getAllAnnouncements() {
    return await fromPrismaPromise(async () => {
      const [draft, published] = await Promise.all([
        this.prismaService.announcementDraft.findMany({
          select: {
            id: true,
            title: true,
            content: true,
            type: true,
            iconImage: true,
            backgroundColor: true,
            createdAt: true,
            updatedAt: true,
            topics: {
              select: {
                topicId: true,
              },
            },
            attachments: {
              select: {
                filePath: true,
              },
            },
          },
        }),
        this.prismaService.announcement.findMany({
          select: {
            feedItemId: true,
            title: true,
            content: true,
            type: true,
            iconImage: true,
            backgroundColor: true,
            topics: {
              select: {
                topicId: true,
              },
            },
            attachments: {
              select: {
                filePath: true,
              },
            },
            feedItem: {
              select: {
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        }),
      ])

      return [
        ...draft.map((item) => ({
          ...item,
          topics: item.topics.map((topic) => topic.topicId),
          attachments: item.attachments.map((attachment) => attachment.filePath),
        })),
        ...published.map(({ feedItemId, topics, attachments, feedItem, ...item }) => ({
          id: feedItemId,
          topics: topics.map((topic) => topic.topicId),
          attachments: attachments.map((attachment) => attachment.filePath),
          createdAt: feedItem.createdAt,
          updatedAt: feedItem.updatedAt,
          ...item,
        })),
      ]
    })
  }

  async getAnnouncements(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const { limit, page } = query
    const skip = Math.max((page - 1) * limit, 0)

    return await fromPrismaPromise(async () => {
      const result = await this.prismaService.announcement.findMany({
        select: {
          feedItemId: true,
          title: true,
          content: true,
          type: true,
          iconImage: true,
          backgroundColor: true,
          topics: {
            select: {
              topicId: true,
            },
          },
          attachments: {
            select: {
              filePath: true,
            },
          },
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

      return result.map(({ feedItemId, topics, attachments, feedItem, ...item }) => ({
        id: feedItemId,
        topics: topics.map((topic) => topic.topicId),
        attachments: attachments.map((attachment) => attachment.filePath),
        createdAt: feedItem.createdAt,
        updatedAt: feedItem.updatedAt,
        ...item,
      }))
    })
  }

  async getAnnouncementById(announcementId: string) {
    return await fromPrismaPromise(async () => {
      const { feedItemId, topics, attachments, feedItem, ...result } =
        await this.prismaService.announcement.findUniqueOrThrow({
          where: { feedItemId: announcementId },
          select: {
            feedItemId: true,
            title: true,
            content: true,
            type: true,
            iconImage: true,
            backgroundColor: true,
            topics: {
              select: {
                topicId: true,
              },
            },
            attachments: {
              select: {
                filePath: true,
              },
            },
            feedItem: {
              select: {
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        })

      return {
        id: feedItemId,
        topics: topics.map((topic) => topic.topicId),
        attachments: attachments.map((attachment) => attachment.filePath),
        createdAt: feedItem.createdAt,
        updatedAt: feedItem.updatedAt,
        ...result,
      }
    })
  }

  async updateAnnouncementById(announcementId: string, data: PutPublishedAnnouncementBody) {
    return await fromPrismaPromise(
      this.prismaService.announcement.update({
        where: { feedItemId: announcementId },
        data: {
          title: data.title,
          content: data.content,
          type: data.type,
          iconImage: data.iconImage,
          backgroundColor: data.backgroundColor,
          topics: {
            deleteMany: {},
            createMany: {
              data: data.topicIds.map((topicId) => ({ topicId })),
            },
          },
          attachments: {
            deleteMany: {},
            createMany: {
              data: data.attachmentFilePaths.map((filePath) => ({ filePath })),
            },
          },
        },
      })
    )
  }

  async unpublishAnnouncementById(announcementId: string) {
    return await fromPrismaPromise(
      this.prismaService.$transaction(async (tx) => {
        // 1. Get the announcement
        const announcement = await tx.announcement.findUniqueOrThrow({
          where: { feedItemId: announcementId },
          select: {
            feedItemId: true,
            title: true,
            content: true,
            type: true,
            iconImage: true,
            backgroundColor: true,
            topics: { select: { topicId: true } },
            attachments: { select: { filePath: true } },
          },
        })

        // 2. Insert into announcementDraft
        const draftedAnnouncement = await tx.announcementDraft.create({
          data: {
            id: announcement.feedItemId,
            title: announcement.title,
            content: announcement.content,
            type: announcement.type,
            iconImage: announcement.iconImage,
            backgroundColor: announcement.backgroundColor,
            topics: { createMany: { data: announcement.topics } },
            attachments: { createMany: { data: announcement.attachments } },
          },
        })

        // 3. Delete the announcement
        await tx.feedItem.delete({ where: { id: announcementId } })

        return draftedAnnouncement
      })
    )
  }

  async deleteAnnouncementById(announcementId: string) {
    const announcement = await this.prismaService.announcement.findUniqueOrThrow({
      where: { feedItemId: announcementId },
      select: {
        attachments: { select: { filePath: true } },
      },
    })

    // TODO - Refactoring
    try {
      await Promise.all(
        announcement.attachments.map((attachment) =>
          this.fileService.deleteFile(attachment.filePath)
        )
      )
    } catch {
      //...
    }

    return await fromPrismaPromise(
      this.prismaService.feedItem.delete({ where: { id: announcementId } })
    )
  }

  async getDraftedAnnouncements(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const { limit, page } = query
    const skip = Math.max((page - 1) * limit, 0)

    return await fromPrismaPromise(async () => {
      const result = await this.prismaService.announcementDraft.findMany({
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          iconImage: true,
          backgroundColor: true,
          createdAt: true,
          updatedAt: true,
          topics: {
            select: {
              topicId: true,
            },
          },
          attachments: {
            select: {
              filePath: true,
            },
          },
        },
        take: limit,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
      })

      return result.map((item) => ({
        ...item,
        topics: item.topics.map((topic) => topic.topicId),
        attachments: item.attachments.map((attachment) => attachment.filePath),
      }))
    })
  }

  async getDraftedAnnouncementById(announcementDraftId: string) {
    return await fromPrismaPromise(async () => {
      const result = await this.prismaService.announcementDraft.findUniqueOrThrow({
        where: { id: announcementDraftId },
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          iconImage: true,
          backgroundColor: true,
          createdAt: true,
          updatedAt: true,
          topics: {
            select: {
              topicId: true,
            },
          },
          attachments: {
            select: {
              filePath: true,
            },
          },
        },
      })

      return {
        ...result,
        topics: result.topics.map((topic) => topic.topicId),
        attachments: result.attachments.map((attachment) => attachment.filePath),
      }
    })
  }

  async createEmptyDraftedAnnouncement() {
    return await fromPrismaPromise(this.prismaService.announcementDraft.create({ data: {} }))
  }

  async updateDraftedAnnouncementById(
    announcementDraftId: string,
    data: PutDraftedAnnouncementBody
  ) {
    return await fromPrismaPromise(
      this.prismaService.announcementDraft.update({
        where: { id: announcementDraftId },
        data: {
          title: data.title,
          content: data.content,
          type: data.type,
          iconImage: data.iconImage,
          backgroundColor: data.backgroundColor,
          topics: {
            deleteMany: {},
            createMany: {
              data: data.topicIds.map((topicId) => ({ topicId })),
            },
          },
          attachments: {
            deleteMany: {},
            createMany: {
              data: data.attachmentFilePaths.map((filePath) => ({ filePath })),
            },
          },
        },
      })
    )
  }

  async publishDraftedAnnouncementById(announcementDraftId: string, authorId: string) {
    return await fromPrismaPromise(
      this.prismaService.$transaction(async (tx) => {
        // 1. Get Announcement Draft
        const announcementDraft = await tx.announcementDraft.findUniqueOrThrow({
          where: { id: announcementDraftId },
          select: {
            id: true,
            title: true,
            content: true,
            type: true,
            iconImage: true,
            backgroundColor: true,
            topics: { select: { topicId: true } },
            attachments: { select: { filePath: true } },
          },
        })

        if (announcementDraft.title === null || announcementDraft.type === null)
          throw new Error('Title and Type are required')

        // 2. Insert into FeedItem
        const feedItem = await tx.feedItem.create({
          data: {
            id: announcementDraft.id,
            type: FeedItemType.ANNOUNCEMENT,
            authorId,
            announcement: {
              create: {
                title: announcementDraft.title,
                content: announcementDraft.content,
                type: announcementDraft.type,
                iconImage: announcementDraft.iconImage,
                backgroundColor: announcementDraft.backgroundColor,
                topics: { createMany: { data: announcementDraft.topics } },
                attachments: { createMany: { data: announcementDraft.attachments } },
              },
            },
          },
        })

        // 3. Delete Announcement Draft
        await tx.announcementDraft.delete({ where: { id: announcementDraftId } })

        return feedItem
      })
    )
  }

  async deleteDraftedAnnouncementById(announcementDraftId: string) {
    const announcement = await this.prismaService.announcementDraft.findUniqueOrThrow({
      where: { id: announcementDraftId },
      select: {
        attachments: { select: { filePath: true } },
      },
    })

    // TODO - Refactoring
    try {
      await Promise.all(
        announcement.attachments.map((attachment) =>
          this.fileService.deleteFile(attachment.filePath)
        )
      )
    } catch {
      //...
    }

    return await fromPrismaPromise(
      this.prismaService.announcementDraft.delete({ where: { id: announcementDraftId } })
    )
  }
}

export const AdminAnnouncementRepositoryPlugin = new Elysia({
  name: 'AdminAnnouncementRepository',
})
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    adminAnnouncementRepository: new AdminAnnouncementRepository(prismaService, fileService),
  }))
