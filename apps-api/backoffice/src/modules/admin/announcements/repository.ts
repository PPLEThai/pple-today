import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { PutDraftAnnouncementBody, PutPublishedAnnouncementBody } from './models'

import { FeedItemType } from '../../../../__generated__/prisma'
import { InternalErrorCode } from '../../../dtos/error'
import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { err, fromRepositoryPromise } from '../../../utils/error'
import { FileService, FileServicePlugin } from '../../file/services'

export class AdminAnnouncementRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  private async cleanUpUnusedAttachment(before: string[], after: string[]) {
    const unusedAttachments = before.filter((filePath) => !after.includes(filePath))

    if (unusedAttachments.length > 0) {
      const deleteResult = await this.fileService.bulkDeleteFile(unusedAttachments)
      if (deleteResult.isErr()) {
        return err(deleteResult.error)
      }
    }

    return ok(true)
  }

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
      this.prismaService.$transaction(async (tx) => {
        const announcement = await tx.announcement.findUniqueOrThrow({
          where: { feedItemId: announcementId },
          select: {
            attachments: {
              select: {
                filePath: true,
              },
            },
          },
        })

        const cleanUpResult = await this.cleanUpUnusedAttachment(
          announcement.attachments.map((attachment) => attachment.filePath),
          data.attachmentFilePaths
        )

        if (cleanUpResult.isErr()) {
          return err(cleanUpResult.error)
        }

        const updatedAttachmentsResult = await this.fileService.moveFileToPublicFolder(
          data.attachmentFilePaths
        )

        if (updatedAttachmentsResult.isErr()) {
          return err({
            code: InternalErrorCode.FILE_MOVE_ERROR,
            message: 'Failed to move one or more files',
          })
        }

        const markAsPublicResult = await this.fileService.bulkMarkAsPublic(
          updatedAttachmentsResult.value
        )

        if (markAsPublicResult.isErr()) {
          return err(markAsPublicResult.error)
        }

        return await tx.announcement.update({
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
                data: updatedAttachmentsResult.value.map((filePath) => ({ filePath })),
              },
            },
          },
        })
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

        const markAsPrivateResult = await this.fileService.bulkMarkAsPrivate(
          draftAnnouncement.attachments.map((attachment) => attachment.filePath)
        )

        if (markAsPrivateResult.isErr()) {
          return err(markAsPrivateResult.error)
        }

        return draftAnnouncement
      })
    )
  }

  async deleteAnnouncementById(announcementId: string) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const feedItem = await tx.feedItem.delete({
          where: { id: announcementId },
          select: {
            id: true,
            announcement: { select: { attachments: { select: { id: true, filePath: true } } } },
          },
        })

        const deleteResult = await this.fileService.bulkDeleteFile(
          feedItem.announcement?.attachments.map((attachment) => attachment.filePath) ?? []
        )

        if (deleteResult.isErr()) {
          return err(deleteResult.error)
        }

        return feedItem
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
      this.prismaService.$transaction(async (tx) => {
        const draftAnnouncement = await tx.announcementDraft.findUniqueOrThrow({
          where: { id: announcementDraftId },
          select: { attachments: { select: { filePath: true } } },
        })

        const cleanUpResult = await this.cleanUpUnusedAttachment(
          draftAnnouncement.attachments.map(({ filePath }) => filePath),
          data.attachmentFilePaths
        )

        if (cleanUpResult.isErr()) return err(cleanUpResult.error)

        const draftAnnouncementAttachments = await this.fileService.moveFileToPublicFolder(
          data.attachmentFilePaths
        )

        if (draftAnnouncementAttachments.isErr()) return err(draftAnnouncementAttachments.error)

        return await tx.announcementDraft.update({
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
                data: draftAnnouncementAttachments.value.map((filePath) => ({ filePath })),
              },
            },
          },
        })
      })
    )
  }

  async publishDraftAnnouncementById(announcementDraftId: string, authorId: string) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const draftAnnouncement = await tx.announcementDraft.findUniqueOrThrow({
          where: { id: announcementDraftId },
          include: { topics: true, attachments: { select: { filePath: true } } },
        })

        if (!draftAnnouncement.title || !draftAnnouncement.type) {
          return err({
            code: InternalErrorCode.ANNOUNCEMENT_INVALID_DRAFT,
            message: 'Draft announcement is missing required fields: title, type',
          })
        }

        const attachments = await this.fileService.moveFileToPublicFolder(
          draftAnnouncement.attachments.map(({ filePath }) => filePath)
        )

        if (attachments.isErr()) {
          return err({
            code: InternalErrorCode.FILE_MOVE_ERROR,
            message: 'Failed to move one or more files',
          })
        }

        const markPublicResult = await this.fileService.bulkMarkAsPublic(attachments.value)

        if (markPublicResult.isErr()) {
          return err(markPublicResult.error)
        }

        const feedItem = await tx.feedItem.create({
          data: {
            id: draftAnnouncement.id,
            type: FeedItemType.ANNOUNCEMENT,
            authorId,
            announcement: {
              create: {
                title: draftAnnouncement.title,
                content: draftAnnouncement.content,
                type: draftAnnouncement.type,
                iconImage: draftAnnouncement.iconImage,
                backgroundColor: draftAnnouncement.backgroundColor,
                topics: {
                  createMany: {
                    data: draftAnnouncement.topics.map(({ topicId }) => ({ topicId })),
                  },
                },
                attachments: {
                  createMany: {
                    data: attachments.value.map((attachment) => ({
                      filePath: attachment,
                    })),
                  },
                },
              },
            },
          },
        })

        await tx.announcementDraft.delete({ where: { id: draftAnnouncement.id } })

        return feedItem
      })
    )
  }

  async deleteDraftAnnouncementById(announcementDraftId: string) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const announcementDraft = await tx.announcementDraft.delete({
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

        const deleteResult = await this.fileService.bulkDeleteFile(
          announcementDraft.attachments.map((attachment) => attachment.filePath)
        )

        if (deleteResult.isErr()) {
          return err(deleteResult.error)
        }

        return announcementDraft
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
