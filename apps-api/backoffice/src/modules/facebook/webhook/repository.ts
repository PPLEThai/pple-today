import Elysia from 'elysia'

import { FeedItemType, PostAttachmentType } from '../../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'

export class FacebookWebhookRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getExistingPostByFacebookPostId(facebookPostId: string) {
    return await fromPrismaPromise(
      this.prismaService.feedItem.findUniqueOrThrow({
        where: {
          id: undefined,
          type: FeedItemType.POST,
          post: {
            facebookPostId,
          },
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
    return await fromPrismaPromise(async () => {
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
    return await fromPrismaPromise(
      this.prismaService.feedItem.update({
        where: {
          id: undefined,
          type: FeedItemType.POST,
          post: {
            facebookPostId: data.postId,
          },
        },
        data: {
          post: {
            update: {
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
          },
        },
      })
    )
  }

  async deletePost(facebookPostId: string) {
    return await fromPrismaPromise(
      this.prismaService.feedItem.delete({
        where: {
          id: undefined,
          post: {
            facebookPostId,
          },
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
    return await fromPrismaPromise(
      this.prismaService.feedItem.update({
        where: {
          id: undefined,
          post: {
            facebookPostId,
          },
        },
        data: {
          post: {
            update: {
              attachments: {
                create: links.map((link, idx) => ({
                  url: link.url,
                  type: link.type,
                  order: idx + 1,
                  cacheKey: link.cacheKey,
                })),
              },
            },
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
