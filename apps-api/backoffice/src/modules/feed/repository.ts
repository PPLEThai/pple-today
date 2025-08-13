import Elysia from 'elysia'
import { Ok, ok } from 'neverthrow'
import { sumBy } from 'remeda'

import { GetFeedContentResponse } from './models'

import { FeedItemReactionType, FeedItemType, Prisma } from '../../../__generated__/prisma'
import { InternalErrorCode } from '../../dtos/error'
import { FeedItem, FeedItemBaseContent } from '../../dtos/feed'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { err, exhaustiveGuard } from '../../utils/error'
import { fromRepositoryPromise } from '../../utils/error'
import { FileService, FileServicePlugin } from '../file/services'

export class FeedRepository {
  constructor(
    private prismaService: PrismaService,
    private fileService: FileService
  ) {}

  private readonly constructFeedItemInclude = (userId?: string) =>
    ({
      author: {
        include: {
          address: {
            select: {
              province: true,
              district: true,
            },
          },
        },
      },
      announcement: {
        include: {
          attachments: true,
        },
      },
      reactions: userId
        ? {
            where: { userId },
          }
        : undefined,
      reactionCounts: true,
      poll: {
        include: {
          options: {
            include: {
              pollAnswers: userId
                ? {
                    where: {
                      userId,
                    },
                  }
                : undefined,
            },
          },
        },
      },
      post: {
        include: {
          hashTags: {
            include: {
              hashTag: true,
            },
          },
          attachments: true,
        },
      },
    }) satisfies Prisma.FeedItemInclude

  private transformToFeedItem(
    rawFeedItem: Prisma.FeedItemGetPayload<{
      include: ReturnType<typeof FeedRepository.prototype.constructFeedItemInclude>
    }>
  ) {
    const feedItemBaseContent: FeedItemBaseContent = {
      id: rawFeedItem.id,
      createdAt: rawFeedItem.createdAt,
      commentCount: rawFeedItem.numberOfComments,
      userReaction: rawFeedItem.reactions?.[0]?.type,
      reactions: rawFeedItem.reactionCounts,
      author: {
        id: rawFeedItem.author.id,
        name: rawFeedItem.author.name,
        profileImage: rawFeedItem.author.profileImage
          ? this.fileService.getPublicFileUrl(rawFeedItem.author.profileImage)
          : undefined,
        address: rawFeedItem.author.address ?? undefined,
      },
    }

    switch (rawFeedItem.type) {
      case FeedItemType.POLL:
        if (!rawFeedItem.poll) {
          return err({
            code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
            message: 'Feed item poll content not found',
          })
        }

        return ok({
          ...feedItemBaseContent,
          type: FeedItemType.POLL,
          poll: {
            title: rawFeedItem.poll.title,
            options: rawFeedItem.poll.options.map((option) => ({
              id: option.id,
              title: option.title,
              isSelected: (option.pollAnswers ?? []).length > 0,
              votes: (option.pollAnswers ?? []).length,
            })),
            endAt: rawFeedItem.poll.endAt,
            totalVotes: sumBy(
              rawFeedItem.poll.options,
              (option) => (option.pollAnswers ?? []).length
            ),
          },
        } satisfies GetFeedContentResponse)
      case FeedItemType.ANNOUNCEMENT:
        if (!rawFeedItem.announcement) {
          return err({
            code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
            message: 'Feed item announcement content not found',
          })
        }

        return ok({
          ...feedItemBaseContent,
          type: FeedItemType.ANNOUNCEMENT,
          announcement: {
            content: rawFeedItem.announcement.content ?? '',
            title: rawFeedItem.announcement.title,
            attachments: rawFeedItem.announcement.attachments.map((attachment) =>
              this.fileService.getPublicFileUrl(attachment.filePath)
            ),
          },
        } satisfies GetFeedContentResponse)
      case FeedItemType.POST:
        if (!rawFeedItem.post) {
          return err({
            code: InternalErrorCode.FEED_ITEM_NOT_FOUND,
            message: 'Feed item post content not found',
          })
        }

        return ok({
          ...feedItemBaseContent,
          type: FeedItemType.POST,
          post: {
            content: rawFeedItem.post.content ?? '',
            hashTags: rawFeedItem.post.hashTags.map(({ hashTag }) => ({
              id: hashTag.id,
              name: hashTag.name,
            })),
            attachments: rawFeedItem.post.attachments.map((image) => ({
              id: image.id,
              type: image.type,
              url: this.fileService.getPublicFileUrl(image.url),
            })),
          },
        } satisfies GetFeedContentResponse)
      default:
        exhaustiveGuard(rawFeedItem.type)
    }
  }

  async listTopicFeedItems({
    userId,
    topicId,
    page,
    limit,
  }: {
    userId?: string
    topicId: string
    page: number
    limit: number
  }) {
    const skip = Math.max((page - 1) * limit, 0)
    const rawFeedItems = await fromRepositoryPromise(
      this.prismaService.feedItem.findMany({
        take: limit,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
        where: {
          OR: [
            {
              post: {
                hashTags: {
                  some: {
                    hashTag: {
                      hashTagInTopics: {
                        some: {
                          topicId,
                        },
                      },
                    },
                  },
                },
              },
            },
            {
              announcement: {
                topics: {
                  some: {
                    topicId,
                  },
                },
              },
            },
            {
              poll: {
                topics: {
                  some: {
                    topicId,
                  },
                },
              },
            },
          ],
        },
        include: this.constructFeedItemInclude(userId),
      })
    )

    if (rawFeedItems.isErr()) return err(rawFeedItems.error)

    const feedItems = rawFeedItems.value.map((item) => this.transformToFeedItem(item))
    const feedItemErr = feedItems.find((item) => item.isErr())

    if (feedItemErr) {
      return err(feedItemErr.error)
    }

    return ok(feedItems.map((feedItem) => (feedItem as Ok<FeedItem, never>).value))
  }

  async listHashTagFeedItems({
    userId,
    hashTagId,
    page,
    limit,
  }: {
    userId?: string
    hashTagId: string
    page: number
    limit: number
  }) {
    const skip = Math.max((page - 1) * limit, 0)
    const rawFeedItems = await fromRepositoryPromise(
      this.prismaService.feedItem.findMany({
        take: limit,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
        where: {
          OR: [
            {
              post: {
                hashTags: {
                  some: {
                    hashTagId,
                  },
                },
              },
            },
            {
              announcement: {
                topics: {
                  some: {
                    topic: {
                      hashTagInTopics: {
                        some: {
                          hashTagId,
                        },
                      },
                    },
                  },
                },
              },
            },
            {
              poll: {
                topics: {
                  some: {
                    topic: {
                      hashTagInTopics: {
                        some: {
                          hashTagId,
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        include: this.constructFeedItemInclude(userId),
      })
    )

    if (rawFeedItems.isErr()) return err(rawFeedItems.error)

    const feedItems = rawFeedItems.value.map((item) => this.transformToFeedItem(item))
    const feedItemErr = feedItems.find((item) => item.isErr())

    if (feedItemErr) {
      return err(feedItemErr.error)
    }

    return ok(feedItems.map((feedItem) => (feedItem as Ok<FeedItem, never>).value))
  }

  async listFeedItems({ userId, page, limit }: { userId?: string; page: number; limit: number }) {
    const skip = Math.max((page - 1) * limit, 0)
    const rawFeedItems = await fromRepositoryPromise(
      this.prismaService.feedItem.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        include: this.constructFeedItemInclude(userId),
      })
    )

    if (rawFeedItems.isErr()) return err(rawFeedItems.error)

    const feedItems = rawFeedItems.value.map((item) => this.transformToFeedItem(item))
    const feedItemErr = feedItems.find((item) => item.isErr())

    if (feedItemErr) {
      return err(feedItemErr.error)
    }

    return ok(feedItems.map((feedItem) => (feedItem as Ok<FeedItem, never>).value))
  }

  async getFeedItemById(feedItemId: string, userId?: string) {
    const rawFeedItem = await fromRepositoryPromise(
      this.prismaService.feedItem.findUniqueOrThrow({
        where: { id: feedItemId },
        include: this.constructFeedItemInclude(userId),
      })
    )
    if (rawFeedItem.isErr()) return err(rawFeedItem.error)

    return this.transformToFeedItem(rawFeedItem.value)
  }

  async getFeedItemReactionByUserId({
    feedItemId,
    userId,
  }: {
    feedItemId: string
    userId: string
  }) {
    return await fromRepositoryPromise(
      this.prismaService.feedItemReaction.findUnique({
        where: {
          userId_feedItemId: {
            userId,
            feedItemId,
          },
        },
        select: {
          type: true,
        },
      })
    )
  }

  async createFeedItemReaction({
    feedItemId,
    userId,
    type,
    content,
  }: {
    feedItemId: string
    userId: string
    type: FeedItemReactionType
    content?: string
  }) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const result = await tx.feedItemReaction.create({
          data: {
            feedItemId,
            userId,
            type,
          },
        })

        await tx.feedItemReactionCount.upsert({
          where: { feedItemId_type: { feedItemId, type } },
          update: { count: { increment: 1 } },
          create: { feedItemId, type, count: 1 },
        })

        if (type === FeedItemReactionType.DOWN_VOTE && content) {
          await tx.feedItemComment.create({
            data: {
              feedItemId,
              userId,
              content,
              isPrivate: true, // Assuming downvotes are private comments
            },
          })

          await tx.feedItem.update({
            where: { id: feedItemId },
            data: {
              numberOfComments: { increment: 1 },
            },
          })
        }

        return result
      })
    )
  }

  async updateFeedItemReaction({
    feedItemId,
    userId,
    type,
    content,
  }: {
    feedItemId: string
    userId: string
    type: FeedItemReactionType
    content?: string
  }) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const reaction = await tx.feedItemReaction.findUniqueOrThrow({
          where: {
            userId_feedItemId: {
              userId,
              feedItemId,
            },
          },
        })

        if (reaction.type === type) {
          return reaction // No change needed
        }

        const updatedReaction = await tx.feedItemReaction.update({
          where: {
            userId_feedItemId: {
              userId,
              feedItemId,
            },
          },
          data: { type },
        })

        await tx.feedItemReactionCount.upsert({
          where: { feedItemId_type: { feedItemId, type } },
          update: { count: { increment: 1 } },
          create: { feedItemId, type, count: 1 },
        })

        await tx.feedItemReactionCount.upsert({
          where: { feedItemId_type: { feedItemId, type: reaction.type } },
          update: { count: { decrement: 1 } },
          create: { feedItemId, type: reaction.type, count: 0 },
        })

        if (type === FeedItemReactionType.DOWN_VOTE) {
          await tx.feedItem.update({
            where: { id: feedItemId },
            data: {
              numberOfComments: { increment: content ? 1 : 0 },
            },
          })

          if (content) {
            await tx.feedItemComment.create({
              data: {
                feedItemId,
                userId,
                content,
                isPrivate: true, // Assuming downvotes are private comments
              },
            })
          }
        }

        return updatedReaction
      })
    )
  }

  async deleteFeedItemReaction({ feedItemId, userId }: { feedItemId: string; userId: string }) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        const reaction = await tx.feedItemReaction.delete({
          where: {
            userId_feedItemId: {
              userId,
              feedItemId,
            },
          },
        })

        await tx.feedItemReactionCount.upsert({
          where: { feedItemId_type: { feedItemId, type: reaction.type } },
          update: { count: { decrement: 1 } },
          create: { feedItemId, type: reaction.type, count: 0 },
        })
      })
    )
  }

  async getFeedItemComments(
    feedItemId: string,
    query: { userId?: string; page: number; limit: number }
  ) {
    return await fromRepositoryPromise(
      this.prismaService.feedItemComment.findMany({
        where: {
          feedItemId,
          OR: [{ isPrivate: false }, { userId: query.userId }],
        },
        select: {
          id: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              profileImage: true,
              address: {
                select: {
                  province: true,
                  district: true,
                },
              },
            },
          },
          content: true,
          isPrivate: true,
        },
      })
    )
  }

  async createFeedItemComment({
    feedItemId,
    userId,
    content,
    isPrivate,
  }: {
    feedItemId: string
    userId: string
    content: string
    isPrivate: boolean
  }) {
    const result = await fromRepositoryPromise(
      this.prismaService.$transaction([
        this.prismaService.feedItemComment.create({
          data: {
            feedItemId,
            userId,
            content,
            isPrivate,
          },
          select: {
            id: true,
            content: true,
            isPrivate: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                profileImage: true,
              },
            },
          },
        }),
        this.prismaService.feedItem.update({
          where: { id: feedItemId },
          data: {
            numberOfComments: { increment: 1 },
          },
        }),
      ])
    )

    if (result.isErr()) {
      return result
    }

    return ok(result.value[0])
  }

  async updateFeedItemComment({
    feedItemId,
    commentId,
    userId,
    content,
  }: {
    feedItemId: string
    commentId: string
    userId: string
    content: string
  }) {
    return await fromRepositoryPromise(
      this.prismaService.feedItemComment.updateMany({
        where: {
          id: commentId,
          feedItemId,
          userId,
        },
        data: {
          content,
        },
      })
    )
  }

  async deleteFeedItemComment({
    commentId,
    userId,
    feedItemId,
  }: {
    commentId: string
    userId: string
    feedItemId: string
  }) {
    return await fromRepositoryPromise(
      this.prismaService.feedItemComment.deleteMany({
        where: {
          id: commentId,
          userId,
          feedItemId,
        },
      })
    )
  }

  async checkTopicExists(topicId: string) {
    return await fromRepositoryPromise(
      this.prismaService.topic.findUniqueOrThrow({
        where: { id: topicId },
      })
    )
  }

  async checkHashTagExists(hashTagId: string) {
    return await fromRepositoryPromise(
      this.prismaService.hashTag.findUniqueOrThrow({
        where: { id: hashTagId },
      })
    )
  }
}

export const FeedRepositoryPlugin = new Elysia({ name: 'FeedRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    feedRepository: new FeedRepository(prismaService, fileService),
  }))
