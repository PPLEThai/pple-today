import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { FilePath } from '@pple-today/api-common/dtos'
import { FileService, FileTransactionService, PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { FeedItemType } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { PostAnnouncementBody, PutAnnouncementBody } from './models'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminAnnouncementRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  private async cleanUpUnusedAttachment(
    fileTx: FileTransactionService,
    before: FilePath[],
    after: FilePath[]
  ) {
    const unusedAttachments = before.filter((filePath) => !after.includes(filePath))

    if (unusedAttachments.length > 0) {
      const deleteResult = await fileTx.bulkDeleteFile(unusedAttachments)
      if (deleteResult.isErr()) {
        return err(deleteResult.error)
      }
    }

    return ok(true)
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
          status: true,
          type: true,
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
              publishedAt: true,
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
        publishedAt: feedItem.publishedAt,
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
            status: true,
            content: true,
            type: true,
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
                publishedAt: true,
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
        publishedAt: feedItem.publishedAt,
        ...result,
      }
    })
  }

  async createAnnouncement(data: PostAnnouncementBody) {
    const result = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        const movePublicResult = await fileTx.bulkMoveToPublicFolder(data.attachmentFilePaths)

        if (movePublicResult.isErr()) {
          return err({
            code: InternalErrorCode.FILE_MOVE_ERROR,
            message: 'Failed to move one or more files',
          })
        }

        const newAttachmentFilePaths = movePublicResult.value

        const createAnnouncementResult = await this.prismaService.feedItem.create({
          select: {
            id: true,
          },
          data: {
            type: FeedItemType.POLL,
            author: {
              connect: { id: 'pple-official-user' },
            },
            announcement: {
              create: {
                title: data.title,
                content: data.content,
                type: data.type,
                topics: {
                  createMany: {
                    data: data.topicIds.map((topicId) => ({ topicId })),
                  },
                },
                attachments: {
                  createMany: {
                    data: newAttachmentFilePaths.map((filePath) => ({ filePath })),
                  },
                },
              },
            },
          },
        })

        return createAnnouncementResult
      })
    )

    if (result.isErr()) return err(result.error)

    return ok(result.value[0])
  }

  async updateAnnouncementById(announcementId: string, data: PutAnnouncementBody) {
    const announcement = await fromRepositoryPromise(
      this.prismaService.announcement.findUniqueOrThrow({
        where: { feedItemId: announcementId },
        select: {
          attachments: {
            select: {
              filePath: true,
            },
          },
        },
      })
    )

    if (announcement.isErr()) return err(announcement.error)

    const uploadAttachmentResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        const cleanUpResult = await this.cleanUpUnusedAttachment(
          fileTx,
          announcement.value.attachments.map((attachment) => attachment.filePath as FilePath),
          data.attachmentFilePaths
        )

        if (cleanUpResult.isErr()) {
          return cleanUpResult
        }

        const movePublicResult = await fileTx.bulkMoveToPublicFolder(data.attachmentFilePaths)

        if (movePublicResult.isErr()) {
          return err({
            code: InternalErrorCode.FILE_MOVE_ERROR,
            message: 'Failed to move one or more files',
          })
        }

        return movePublicResult.value
      })
    )

    if (uploadAttachmentResult.isErr()) return err(uploadAttachmentResult.error)
    const [newAttachmentFilePaths, fileTx] = uploadAttachmentResult.value

    const updateAnnouncementResult = await fromRepositoryPromise(
      this.prismaService.announcement.update({
        where: { feedItemId: announcementId },
        data: {
          title: data.title,
          content: data.content,
          type: data.type,
          topics: {
            deleteMany: {},
            createMany: {
              data: data.topicIds.map((topicId) => ({ topicId })),
            },
          },
          attachments: {
            deleteMany: {},
            createMany: {
              data: newAttachmentFilePaths.map((filePath) => ({ filePath })),
            },
          },
        },
      })
    )

    if (updateAnnouncementResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(updateAnnouncementResult.error)
    }

    return ok(updateAnnouncementResult.value)
  }

  async deleteAnnouncementById(announcementId: string) {
    const feedItem = await fromRepositoryPromise(
      this.prismaService.feedItem.findUniqueOrThrow({
        where: { id: announcementId },
        select: {
          id: true,
          announcement: { select: { attachments: { select: { id: true, filePath: true } } } },
        },
      })
    )

    if (feedItem.isErr()) return err(feedItem.error)

    const deleteFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        const deleteResult = await fileTx.bulkDeleteFile(
          feedItem.value.announcement?.attachments.map(
            (attachment) => attachment.filePath as FilePath
          ) ?? []
        )

        if (deleteResult.isErr()) {
          return deleteResult
        }

        return feedItem
      })
    )

    if (deleteFileResult.isErr()) {
      return err(deleteFileResult.error)
    }
    const [, fileTx] = deleteFileResult.value

    const deleteAnnouncementError = await fromRepositoryPromise(
      this.prismaService.feedItem.delete({
        where: { id: announcementId },
        select: {
          id: true,
          announcement: { select: { attachments: { select: { id: true, filePath: true } } } },
        },
      })
    )

    if (deleteAnnouncementError.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(deleteAnnouncementError.error)
    }

    return ok(deleteAnnouncementError.value)
  }
}

export const AdminAnnouncementRepositoryPlugin = new Elysia({
  name: 'AdminAnnouncementRepository',
})
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    adminAnnouncementRepository: new AdminAnnouncementRepository(prismaService, fileService),
  }))
