import Elysia from 'elysia'

import { PutDraftAnnouncementBody, PutPublishedAnnouncementBody } from './models'

import { AnnouncementType, FeedItemType } from '../../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { fromRepositoryPromise } from '../../../utils/error'
import { FileService, FileServicePlugin } from '../../file/services'

export class AdminAnnouncementRepository {
  constructor(
    private prismaService: PrismaService,
    private fileService: FileService
  ) {}

  async getAllAnnouncements() {
    return await fromRepositoryPromise(async () => {
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
                topic: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
                topic: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
        })),
        ...published.map(({ feedItemId, feedItem, ...item }) => ({
          id: feedItemId,
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

    return await fromRepositoryPromise(async () => {
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
              topic: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
        topics: topics.map(({ topic }) => topic),
        attachments: attachments.map((attachment) => attachment.filePath),
        createdAt: feedItem.createdAt,
        updatedAt: feedItem.updatedAt,
        ...item,
      }))
    })
  }

  async getAnnouncementById(announcementId: string) {
    return await fromRepositoryPromise(async () => {
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
                topic: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
        topics: topics.map(({ topic }) => topic),
        attachments: attachments.map((attachment) => attachment.filePath),
        createdAt: feedItem.createdAt,
        updatedAt: feedItem.updatedAt,
        ...result,
      }
    })
  }

  async updateAnnouncementById(announcementId: string, data: PutPublishedAnnouncementBody) {
    return await fromRepositoryPromise(
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
    return await fromRepositoryPromise(
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
        const draftAnnouncement = await tx.announcementDraft.create({
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
          include: {
            attachments: true,
          },
        })

        // 3. Delete the announcement
        await tx.feedItem.delete({ where: { id: announcementId } })

        return draftAnnouncement
      })
    )
  }

  async deleteAnnouncementById(announcementId: string) {
    return await fromRepositoryPromise(
      this.prismaService.feedItem.delete({
        where: { id: announcementId },
        select: {
          id: true,
          announcement: { select: { attachments: { select: { id: true, filePath: true } } } },
        },
      })
    )
  }

  async getDraftAnnouncements(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const { limit, page } = query
    const skip = Math.max((page - 1) * limit, 0)

    return await fromRepositoryPromise(async () => {
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
              topic: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
        topics: item.topics.map(({ topic }) => topic),
        attachments: item.attachments.map((attachment) => attachment.filePath),
      }))
    })
  }

  async getDraftAnnouncementById(announcementDraftId: string) {
    return await fromRepositoryPromise(async () => {
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
              topic: {
                select: {
                  id: true,
                  name: true,
                },
              },
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
        topics: result.topics.map(({ topic }) => topic),
        attachments: result.attachments.map((attachment) => attachment.filePath),
      }
    })
  }

  async createEmptyDraftAnnouncement() {
    return await fromRepositoryPromise(this.prismaService.announcementDraft.create({ data: {} }))
  }

  async updateDraftAnnouncementById(announcementDraftId: string, data: PutDraftAnnouncementBody) {
    return await fromRepositoryPromise(
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

  async publishDraftAnnouncementById(
    announcementDraft: {
      id: string
      title: string
      content: string | null
      type: AnnouncementType
      iconImage: string | null
      backgroundColor: string | null
      topics: string[]
      attachments: string[]
    },
    authorId: string
  ) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
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
                topics: {
                  createMany: {
                    data: announcementDraft.topics.map((topicId) => ({ topicId })),
                  },
                },
                attachments: {
                  createMany: {
                    data: announcementDraft.attachments.map((attachment) => ({
                      filePath: attachment,
                    })),
                  },
                },
              },
            },
          },
        })

        // 3. Delete Announcement Draft
        await tx.announcementDraft.delete({ where: { id: announcementDraft.id } })

        return feedItem
      })
    )
  }

  async deleteDraftAnnouncementById(announcementDraftId: string) {
    return await fromRepositoryPromise(
      this.prismaService.announcementDraft.delete({
        where: { id: announcementDraftId },
        select: {
          id: true,
          attachments: {
            select: {
              filePath: true,
            },
          },
        },
      })
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
