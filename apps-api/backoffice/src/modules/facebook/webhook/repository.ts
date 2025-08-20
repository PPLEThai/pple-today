import Elysia from 'elysia'

import { FeedItemType, PostAttachmentType } from '../../../../__generated__/prisma'
import { InternalErrorCode } from '../../../dtos/error'
import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { err } from '../../../utils/error'
import { fromRepositoryPromise } from '../../../utils/error'

export class FacebookWebhookRepository {
  constructor(private readonly prismaService: PrismaService) {}

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

    return await fromRepositoryPromise(
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
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    facebookWebhookRepository: new FacebookWebhookRepository(prismaService),
  }))
