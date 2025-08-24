import { createId } from '@paralleldrive/cuid2'
import Elysia from 'elysia'
import { ok } from 'neverthrow'
import * as R from 'remeda'

import { FeedItemType, PostAttachment, PostAttachmentType } from '../../../../__generated__/prisma'
import { InternalErrorCode } from '../../../dtos/error'
import { FilePath } from '../../../dtos/file'
import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { err } from '../../../utils/error'
import { fromRepositoryPromise } from '../../../utils/error'
import { getFileName } from '../../../utils/facebook'
import { FileService, FileServicePlugin } from '../../file/services'

export class FacebookWebhookRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  async handleAttachmentChanges(
    pageId: string,
    existingAttachments: PostAttachment[],
    newAttachments: Pick<PostAttachment, 'url' | 'type' | 'cacheKey'>[]
  ) {
    return await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        const requiredDelete = R.pipe(
          existingAttachments,
          R.filter((ea) => !newAttachments.find((a) => ea.cacheKey === a.cacheKey)),
          R.map((ea) => ea.url)
        )

        const requiredUpload = R.pipe(
          newAttachments ?? [],
          R.filter((a) => !existingAttachments.find((ea) => ea.cacheKey === a.cacheKey))
        )

        const unchangedAttachments = R.pipe(
          existingAttachments,
          R.filter((ea) => newAttachments.findIndex((a) => ea.cacheKey === a.cacheKey) !== -1)
        )

        const deleteResult = await fileTx.bulkRemoveFile(requiredDelete as FilePath[])

        if (deleteResult.isErr()) {
          return deleteResult
        }

        const result = await Promise.all(
          requiredUpload.map(async (attachment) => {
            const fileName = getFileName(attachment.url)
            const newFilename: FilePath = `temp/facebook/${pageId}/${createId()}-${fileName}`
            const uploadResult = await fileTx.uploadFileFromUrl(attachment.url, newFilename)

            if (uploadResult.isErr()) {
              return uploadResult
            }

            const moveToPublicFolderResult = await fileTx.bulkMoveToPublicFolder([newFilename])

            if (moveToPublicFolderResult.isErr()) {
              return moveToPublicFolderResult
            }

            return ok({
              url: moveToPublicFolderResult.value[0],
              type: attachment.type,
              cacheKey: fileName,
            })
          }) ?? []
        )

        const resultWithoutFailed = R.pipe(
          result,
          R.filter((r) => r.isOk()),
          R.map((r) => r.value)
        )

        if (resultWithoutFailed.length !== result.length) {
          return err({
            code: InternalErrorCode.FILE_UPLOAD_ERROR,
            message: 'File upload failed',
          })
        }

        return {
          requiredDelete,
          newUploads: resultWithoutFailed,
          unchangedAttachments,
        }
      })
    )
  }

  async getExistingPostByFacebookPostId(facebookPostId: string) {
    return await fromRepositoryPromise(
      this.prismaService.post.findUnique({
        where: {
          facebookPostId,
        },
        include: {
          attachments: true,
        },
      })
    )
  }

  async publishNewPost(data: {
    facebookPageId: string
    content?: string
    postId: string
    attachments?: {
      url: string
      type: PostAttachmentType
      cacheKey: string
    }[]
    hashTags?: string[]
  }) {
    return await fromRepositoryPromise(async () => {
      const pageManager = await this.prismaService.facebookPage.findUniqueOrThrow({
        where: {
          id: data.facebookPageId,
          NOT: {
            managerId: null,
          },
        },
      })

      return await this.prismaService.feedItem.create({
        data: {
          type: FeedItemType.POST,
          author: {
            connect: {
              id: pageManager.managerId!,
            },
          },
          post: {
            create: {
              facebookPostId: data.postId,
              content: data.content,
              attachments:
                data.attachments !== undefined
                  ? {
                      create: data.attachments.map((attachment, idx) => ({
                        url: attachment.url,
                        type: attachment.type,
                        order: idx + 1,
                        cacheKey: attachment.cacheKey,
                      })),
                    }
                  : undefined,
              hashTags:
                data.hashTags !== undefined
                  ? {
                      create: data.hashTags.map((tag) => ({
                        hashTag: {
                          connectOrCreate: {
                            where: { name: tag },
                            create: { name: tag },
                          },
                        },
                      })),
                    }
                  : undefined,
            },
          },
        },
      })
    })
  }

  async updatePost(data: {
    postId: string
    facebookPageId: string
    content?: string
    attachments?: {
      url: string
      type: PostAttachmentType
      cacheKey: string
    }[]
    hashTags?: string[]
  }) {
    return await fromRepositoryPromise(
      this.prismaService.post.update({
        where: {
          facebookPostId: data.postId,
        },
        data: {
          content: data.content,
          attachments:
            data.attachments !== undefined
              ? {
                  deleteMany: {},
                  create:
                    data.attachments.map((attachment, idx) => ({
                      url: attachment.url,
                      type: attachment.type,
                      order: idx + 1,
                      cacheKey: attachment.cacheKey,
                    })) ?? [],
                }
              : undefined,
          hashTags:
            data.hashTags !== undefined
              ? {
                  deleteMany: {},
                  create:
                    data.hashTags.map((tag) => ({
                      hashTag: {
                        connectOrCreate: {
                          where: { name: tag },
                          create: { name: tag },
                        },
                      },
                    })) ?? [],
                }
              : undefined,
        },
      })
    )
  }

  async deletePost(facebookPostId: string) {
    const existingPost = await this.getExistingPostByFacebookPostId(facebookPostId)

    if (existingPost.isErr()) {
      return err(existingPost.error)
    }

    if (!existingPost.value) {
      return err({
        code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
        message: 'Post not found',
      })
    }

    const deleteFileResult = await fromRepositoryPromise(
      this.fileService.$transaction(async (fileTx) => {
        const bulkDeleteResult = await fileTx.bulkRemoveFile(
          existingPost.value?.attachments.map((a) => a.url as FilePath) ?? []
        )

        if (bulkDeleteResult.isErr()) return bulkDeleteResult
      })
    )

    if (deleteFileResult.isErr()) return err(deleteFileResult.error)
    const [, fileTx] = deleteFileResult.value

    const deleteFeedResult = await fromRepositoryPromise(
      this.prismaService.feedItem.delete({
        where: {
          id: existingPost.value.feedItemId,
        },
        include: {
          post: {
            include: {
              attachments: true,
            },
          },
        },
      })
    )

    if (deleteFeedResult.isErr()) {
      const rollbackResult = await fileTx.rollback()
      if (rollbackResult.isErr()) return err(rollbackResult.error)
      return err(deleteFeedResult.error)
    }

    return ok(deleteFeedResult.value)
  }

  async addNewAttachments(
    facebookPostId: string,
    links: {
      url: string
      type: PostAttachmentType
      cacheKey: string
    }[]
  ) {
    return await fromRepositoryPromise(
      this.prismaService.post.update({
        where: {
          facebookPostId,
        },
        data: {
          attachments: {
            upsert: links.map((link, idx) => ({
              where: {
                cacheKey: link.cacheKey,
              },
              create: {
                url: link.url,
                type: link.type,
                order: idx + 1,
                cacheKey: link.cacheKey,
              },
              update: {
                url: link.url,
                type: link.type,
                order: idx + 1,
                cacheKey: link.cacheKey,
              },
            })),
          },
        },
      })
    )
  }
}

export const FacebookWebhookRepositoryPlugin = new Elysia({
  name: 'FacebookWebhookRepository',
})
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    facebookWebhookRepository: new FacebookWebhookRepository(prismaService, fileService),
  }))
