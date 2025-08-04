import node from '@elysiajs/node'
import Elysia from 'elysia'

import { PutDraftedAnnouncementBody } from './models'

import { FeedItemType } from '../../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'

export class AdminAnnouncementRepository {
  constructor(private prismaService: PrismaService) {}

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
                url: true,
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
                url: true,
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
          attachments: item.attachments.map((attachment) => attachment.url),
        })),
        ...published.map(({ feedItemId, topics, attachments, feedItem, ...item }) => ({
          id: feedItemId,
          topics: topics.map((topic) => topic.topicId),
          attachments: attachments.map((attachment) => attachment.url),
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
    const skip = page ? (page - 1) * limit : 0

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
              url: true,
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
        attachments: attachments.map((attachment) => attachment.url),
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
                url: true,
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
        attachments: attachments.map((attachment) => attachment.url),
        createdAt: feedItem.createdAt,
        updatedAt: feedItem.updatedAt,
        ...result,
      }
    })
  }

  async updateAnnouncementById(announcementId: string, data: PutDraftedAnnouncementBody) {
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
            // TODO: Call Delete File
            deleteMany: {},
            // TODO: Call Create File
            createMany: {
              data: data.attachmentUrls.map((url) => ({ url })),
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
            attachments: { select: { url: true } },
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
            // TODO: Call Create File
            attachments: { createMany: { data: announcement.attachments } },
          },
        })

        // 3. Delete the announcement
        // TODO: Call Delete File
        await tx.feedItem.delete({ where: { id: announcementId } })

        return draftedAnnouncement
      })
    )
  }

  async deleteAnnouncementById(announcementId: string) {
    // TODO: Call Delete File
    return await fromPrismaPromise(
      this.prismaService.feedItem.delete({ where: { id: announcementId } })
    )
  }

  // TODO
  async uploadFileToAnnouncement(announcementId: string, file: unknown) {
    throw new Error('Not implemented')
  }

  // TODO
  async deleteFileInAnnouncement(announcementId: string, fileId: string) {
    throw new Error('Not implemented')
  }

  async getDraftedAnnouncements(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const { limit, page } = query
    const skip = page ? (page - 1) * limit : 0

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
              url: true,
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
        attachments: item.attachments.map((attachment) => attachment.url),
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
              url: true,
            },
          },
        },
      })

      return {
        ...result,
        topics: result.topics.map((topic) => topic.topicId),
        attachments: result.attachments.map((attachment) => attachment.url),
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
            // TODO: Call Delete File
            deleteMany: {},
            // TODO: Call Create File
            createMany: {
              data: data.attachmentUrls.map((url) => ({ url })),
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
            attachments: { select: { url: true } },
          },
        })

        if (announcementDraft.title === null || announcementDraft.type === null)
          throw new Error('Title and Type are required')

        // 2. Insert into FeedItem
        const feedItem = tx.feedItem.create({
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
                // TODO: Call Create File
                attachments: { createMany: { data: announcementDraft.attachments } },
              },
            },
          },
        })

        // 3. Delete Announcement Draft
        // TODO: Call Delete File
        tx.announcementDraft.delete({ where: { id: announcementDraftId } })

        return feedItem
      })
    )
  }

  async deleteDraftedAnnouncementById(announcementDraftId: string) {
    // TODO: Call Delete File
    return await fromPrismaPromise(
      this.prismaService.announcementDraft.delete({ where: { id: announcementDraftId } })
    )
  }

  // TODO
  async uploadFileToDraftAnnouncement(announcementDraftId: string, file: unknown) {
    throw new Error('Not implemented')
  }

  // TODO
  async deleteFileInDraftAnnouncement(announcementDraftId: string, fileId: string) {
    throw new Error('Not implemented')
  }
}

export const AdminAnnouncementRepositoryPlugin = new Elysia({
  name: 'AdminAnnouncementRepository',
  adapter: node(),
})
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    adminAnnouncementRepository: new AdminAnnouncementRepository(prismaService),
  }))

export default AdminAnnouncementRepository
