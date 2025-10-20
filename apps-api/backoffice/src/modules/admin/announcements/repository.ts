import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { FilePath } from '@pple-today/api-common/dtos'
import { FileService, FileTransactionService, PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { FeedItemType } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetAnnouncementsQuery, PostAnnouncementBody, UpdateAnnouncementBody } from './models'

import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminAnnouncementRepository {
  private OFFICIAL_USER_ID: string | null = null

  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  // TODO: Refactor to common service
  private async lookupOfficialUserId() {
    if (this.OFFICIAL_USER_ID) {
      return ok(this.OFFICIAL_USER_ID)
    }

    const findOfficialResult = await fromRepositoryPromise(
      this.prismaService.user.findFirst({
        where: { roles: { every: { role: 'official' } } },
        select: { id: true },
      })
    )

    if (findOfficialResult.isErr()) {
      return err(findOfficialResult.error)
    }

    if (!findOfficialResult.value) {
      return err({
        message: 'Official user not found',
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
      })
    }

    this.OFFICIAL_USER_ID = findOfficialResult.value.id
    return ok(this.OFFICIAL_USER_ID)
  }

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

  async getAnnouncements(query: GetAnnouncementsQuery = { limit: 10, page: 1 }) {
    const { limit, page } = query
    const skip = Math.max((page - 1) * limit, 0)

    const where = {
      ...(query.search && {
        title: {
          contains: query.search,
          mode: 'insensitive' as const,
        },
      }),
      ...(query.status &&
        query.status.length > 0 && {
          status: {
            in: query.status,
          },
        }),
    }

    return await fromRepositoryPromise(async () => {
      const [rawData, count] = await Promise.all([
        this.prismaService.announcement.findMany({
          select: {
            feedItemId: true,
            title: true,
            status: true,
            feedItem: {
              select: {
                createdAt: true,
                updatedAt: true,
                publishedAt: true,
                reactionCounts: {
                  select: {
                    type: true,
                    count: true,
                  },
                },
                numberOfComments: true,
              },
            },
            type: true,
          },
          take: limit,
          skip,
          orderBy: {
            feedItem: {
              createdAt: 'desc',
            },
          },
          where,
        }),
        this.prismaService.announcement.count({
          where,
        }),
      ])

      return {
        data: rawData.map(({ feedItemId, feedItem, ...item }) => ({
          id: feedItemId,
          createdAt: feedItem.createdAt,
          updatedAt: feedItem.updatedAt,
          publishedAt: feedItem.publishedAt,
          reactionCounts: feedItem.reactionCounts,
          commentsCount: feedItem.numberOfComments,
          ...item,
        })),
        meta: { count },
      }
    })
  }

  async getAnnouncementById(announcementId: string) {
    return await fromRepositoryPromise(async () => {
      const { feedItemId, attachments, feedItem, ...result } =
        await this.prismaService.announcement.findUniqueOrThrow({
          where: { feedItemId: announcementId },
          select: {
            feedItemId: true,
            title: true,
            status: true,
            content: true,
            type: true,
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
                reactionCounts: {
                  select: {
                    type: true,
                    count: true,
                  },
                },
                numberOfComments: true,
                comments: {
                  select: {
                    id: true,
                    content: true,
                    createdAt: true,
                    isPrivate: true,
                    user: {
                      select: {
                        id: true,
                        name: true,
                        profileImagePath: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })

      return {
        id: feedItemId,
        attachments: attachments.map((attachment) => attachment.filePath),
        createdAt: feedItem.createdAt,
        updatedAt: feedItem.updatedAt,
        publishedAt: feedItem.publishedAt,
        reactionCounts: feedItem.reactionCounts,
        commentsCount: feedItem.numberOfComments,
        comments: feedItem.comments.map((comment) => ({
          id: comment.id,
          content: comment.content,
          createdAt: comment.createdAt,
          isPrivate: comment.isPrivate,
          author: {
            id: comment.user.id,
            name: comment.user.name,
            profileImage: comment.user.profileImagePath
              ? this.fileService.getPublicFileUrl(comment.user.profileImagePath)
              : undefined,
          },
        })),
        ...result,
      }
    })
  }

  async createAnnouncement(data: PostAnnouncementBody) {
    const officialUserId = await this.lookupOfficialUserId()

    if (officialUserId.isErr()) return err(officialUserId.error)

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
              connect: { id: officialUserId.value },
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

  async updateAnnouncementById(announcementId: string, data: UpdateAnnouncementBody) {
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
        if (!data.attachmentFilePaths)
          return announcement.value.attachments.map((attachment) => attachment.filePath as FilePath)

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
          type: data.type,
          content: data.content,
          attachments: {
            deleteMany: {},
            createMany: {
              data: newAttachmentFilePaths.map((filePath) => ({ filePath })),
            },
          },
          status: data.status,
          ...(data.status === AnnouncementStatus.PUBLISHED && {
            feedItem: {
              update: {
                publishedAt: new Date(),
              },
            },
          }),
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
      this.prismaService.feedItem.delete({ where: { id: announcementId } })
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
