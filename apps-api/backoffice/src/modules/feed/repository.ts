import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { FeedItem, FeedItemBaseContent } from '@pple-today/api-common/dtos'
import { FileService, PrismaService } from '@pple-today/api-common/services'
import { err, exhaustiveGuard, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { FeedItemReactionType, FeedItemType, Prisma } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { Ok, ok } from 'neverthrow'
import { sumBy } from 'remeda'

import { GetFeedContentResponse } from './models'

import { FileServicePlugin } from '../../plugins/file'
import { PrismaServicePlugin } from '../../plugins/prisma'

export class FeedRepository {
  constructor(
    private prismaService: PrismaService,
    private fileService: FileService
  ) {}

  public constructFeedItemInclude = (userId?: string) =>
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

  public transformToFeedItem(
    rawFeedItem: Prisma.FeedItemGetPayload<{
      include: ReturnType<typeof FeedRepository.prototype.constructFeedItemInclude>
    }>
  ) {
    const feedItemBaseContent: FeedItemBaseContent = {
      id: rawFeedItem.id,
      createdAt: rawFeedItem.createdAt,
      commentCount: rawFeedItem.numberOfComments,
      userReaction: rawFeedItem.reactions?.[0]?.type ?? null,
      reactions: rawFeedItem.reactionCounts,
      author: {
        id: rawFeedItem.author.id,
        name: rawFeedItem.author.name,
        profileImage: rawFeedItem.author.profileImagePath
          ? this.fileService.getPublicFileUrl(rawFeedItem.author.profileImagePath)
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
            type: rawFeedItem.announcement.type,
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
              width: image.width ?? undefined,
              height: image.height ?? undefined,
              thumbnailUrl: image.thumbnailPath
                ? this.fileService.getPublicFileUrl(image.thumbnailPath)
                : undefined,
              url: this.fileService.getPublicFileUrl(image.attachmentPath),
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
          type: {
            not: FeedItemType.ANNOUNCEMENT,
          },
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
          type: {
            not: FeedItemType.ANNOUNCEMENT,
          },
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
        where: {
          type: {
            not: FeedItemType.ANNOUNCEMENT,
          },
        },
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

  async listFeedItemsByUserId(userId: string | undefined, query: { page: number; limit: number }) {
    const skip = Math.max((query.page - 1) * query.limit, 0)
    const rawFeedItems = await fromRepositoryPromise(async () => {
      await this.prismaService.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true },
      })

      return await this.prismaService.feedItem.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: query.limit,
        where: {
          authorId: userId,
          type: {
            not: FeedItemType.ANNOUNCEMENT,
          },
          type: {
            not: FeedItemType.ANNOUNCEMENT,
          },
        },
        include: this.constructFeedItemInclude(userId),
      })
    })

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

  async listFollowingFeedItems(
    userId: string,
    {
      cursor,
      limit,
    }: {
      cursor?: string
      limit: number
    }
  ) {
    const rawFeedItems = await fromRepositoryPromise(
      this.prismaService.feedItem.findMany({
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor
          ? {
              id: cursor,
            }
          : undefined,
        orderBy: {
          createdAt: 'desc',
        },
        include: this.constructFeedItemInclude(userId),
        where: {
          author: {
            followers: {
              some: {
                followerId: userId,
              },
            },
          },
          poll: {
            topics: {
              some: {
                topic: {
                  followedTopics: {
                    some: {
                      userId,
                    },
                  },
                },
              },
            },
          },
        },
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

  async upsertFeedItemReaction({
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
        const existingFeedItemReaction = await tx.feedItemReaction.findUnique({
          where: {
            userId_feedItemId: {
              userId,
              feedItemId,
            },
          },
          select: {
            userId: true,
            feedItemId: true,
            type: true,
          },
        })

        if (existingFeedItemReaction?.type === type) {
          return { ...existingFeedItemReaction, comment: null }
        }

        const reaction = await tx.feedItemReaction.upsert({
          where: {
            userId_feedItemId: {
              userId,
              feedItemId,
            },
          },
          update: {
            type,
          },
          create: {
            feedItemId,
            userId,
            type,
          },
          select: {
            userId: true,
            feedItemId: true,
            type: true,
          },
        })

        await tx.feedItemReactionCount.upsert({
          where: { feedItemId_type: { feedItemId, type } },
          update: { count: { increment: 1 } },
          create: { feedItemId, type, count: 1 },
        })

        if (existingFeedItemReaction) {
          await tx.feedItemReactionCount.upsert({
            where: { feedItemId_type: { feedItemId, type: existingFeedItemReaction.type } },
            update: { count: { decrement: 1 } },
            create: { feedItemId, type: existingFeedItemReaction.type, count: 0 },
          })
        }

        if (type === FeedItemReactionType.DOWN_VOTE && content) {
          const comment = await tx.feedItemComment.create({
            data: {
              feedItemId,
              userId,
              content,
              isPrivate: true, // Assuming downvotes are private comments
            },
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
          })

          await tx.feedItem.update({
            where: { id: feedItemId },
            data: {
              numberOfComments: { increment: 1 },
            },
          })
          return { ...reaction, comment }
        }

        return { reaction, comment: null }
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
    query: { userId?: string; cursor?: string; limit: number }
  ) {
    return await fromRepositoryPromise(
      this.prismaService.feedItemComment.findMany({
        take: query.limit,
        skip: query.cursor ? 1 : 0,
        cursor: query.cursor
          ? {
              id: query.cursor,
            }
          : undefined,
        orderBy: {
          createdAt: 'desc',
        },
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
              profileImagePath: true,
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
                profileImagePath: true,
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
      return err(result.error)
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
