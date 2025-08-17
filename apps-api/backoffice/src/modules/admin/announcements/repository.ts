import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { PutDraftAnnouncementBody, PutPublishedAnnouncementBody } from './models'

import { FeedItemType } from '../../../../__generated__/prisma'
import { InternalErrorCode } from '../../../dtos/error'
import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { err, fromRepositoryPromise, throwWithReturnType } from '../../../utils/error'
import { FileService, FileServicePlugin, FileTransactionService } from '../../file/services'

export class AdminAnnouncementRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  private async cleanUpUnusedAttachment(
    fileTx: FileTransactionService,
    before: string[],
    after: string[]
  ) {
    const unusedAttachments = before.filter((filePath) => !after.includes(filePath))

    if (unusedAttachments.length > 0) {
      const deleteResult = await fileTx.bulkMoveToTempFolder(unusedAttachments)
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
      this.fileService.$transaction((fileTx) =>
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
            fileTx,
            announcement.attachments.map((attachment) => attachment.filePath),
            data.attachmentFilePaths
          )

          if (cleanUpResult.isErr()) {
            return throwWithReturnType(cleanUpResult)
          }

          const updatedAttachmentsResult = await fileTx.bulkMoveToPublicFolder(
            data.attachmentFilePaths
          )

          if (updatedAttachmentsResult.isErr()) {
            return throwWithReturnType(
              err({
                code: InternalErrorCode.FILE_MOVE_ERROR,
                message: 'Failed to move one or more files',
              })
            )
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
    )
  }

  async unpublishAnnouncementById(announcementId: string) {
    return await fromRepositoryPromise(
      this.fileService.$transaction((fileTx) =>
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

          const markAsPrivateResult = await fileTx.bulkMoveToPrivateFolder(
            draftAnnouncement.attachments.map((attachment) => attachment.filePath)
          )

          if (markAsPrivateResult.isErr()) {
            return throwWithReturnType(markAsPrivateResult)
          }

          return draftAnnouncement
        })
      )
    )
  }

  async deleteAnnouncementById(announcementId: string) {
    return await fromRepositoryPromise(
      this.fileService.$transaction((fileTx) =>
        this.prismaService.$transaction(async (tx) => {
          const feedItem = await tx.feedItem.delete({
            where: { id: announcementId },
            select: {
              id: true,
              announcement: { select: { attachments: { select: { id: true, filePath: true } } } },
            },
          })

          const deleteResult = await fileTx.bulkMoveToTempFolder(
            feedItem.announcement?.attachments.map((attachment) => attachment.filePath) ?? []
          )

          if (deleteResult.isErr()) {
            return throwWithReturnType(deleteResult)
          }

          return feedItem
        })
      )
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
      this.fileService.$transaction((fileTx) =>
        this.prismaService.$transaction(async (tx) => {
          const draftAnnouncement = await tx.announcementDraft.findUniqueOrThrow({
            where: { id: announcementDraftId },
            select: { attachments: { select: { filePath: true } } },
          })

          const cleanUpResult = await this.cleanUpUnusedAttachment(
            fileTx,
            draftAnnouncement.attachments.map(({ filePath }) => filePath),
            data.attachmentFilePaths
          )

          if (cleanUpResult.isErr()) return throwWithReturnType(cleanUpResult)

          const draftAnnouncementAttachments = await fileTx.bulkMoveToPrivateFolder(
            data.attachmentFilePaths
          )

          if (draftAnnouncementAttachments.isErr())
            return throwWithReturnType(draftAnnouncementAttachments)

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
    )
  }

  async publishDraftAnnouncementById(announcementDraftId: string, authorId: string) {
    return await fromRepositoryPromise(
      this.fileService.$transaction((fileTx) =>
        this.prismaService.$transaction(async (tx) => {
          const draftAnnouncement = await tx.announcementDraft.findUniqueOrThrow({
            where: { id: announcementDraftId },
            include: { topics: true, attachments: { select: { filePath: true } } },
          })

          if (!draftAnnouncement.title || !draftAnnouncement.type) {
            return throwWithReturnType(
              err({
                code: InternalErrorCode.ANNOUNCEMENT_INVALID_DRAFT,
                message: 'Draft announcement is missing required fields: title, type',
              })
            )
          }

          const attachments = await fileTx.bulkMoveToPublicFolder(
            draftAnnouncement.attachments.map(({ filePath }) => filePath)
          )

          if (attachments.isErr()) {
            return throwWithReturnType(
              err({
                code: InternalErrorCode.FILE_MOVE_ERROR,
                message: 'Failed to move one or more files',
              })
            )
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
    )
  }

  async deleteDraftAnnouncementById(announcementDraftId: string) {
    return await fromRepositoryPromise(
      this.fileService.$transaction((fileTx) =>
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

          const deleteResult = await fileTx.bulkMoveToTempFolder(
            announcementDraft.attachments.map((attachment) => attachment.filePath)
          )

          if (deleteResult.isErr()) {
            return throwWithReturnType(deleteResult)
          }

          return announcementDraft
        })
      )
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
