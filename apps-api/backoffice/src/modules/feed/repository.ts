import { FeedItem, FeedItemBaseContent, InternalErrorCode } from '@pple-today/api-common/dtos'
import { FileService, PrismaService } from '@pple-today/api-common/services'
import { err, exhaustiveGuard, fromRepositoryPromise } from '@pple-today/api-common/utils'
import {
  AnnouncementStatus,
  FeedItemReactionType,
  FeedItemType,
  HashTagStatus,
  PollStatus,
  PostStatus,
  Prisma,
  TopicStatus,
} from '@pple-today/database/prisma'
import { get_candidate_feed_item } from '@pple-today/database/prisma/sql'
import dayjs from 'dayjs'
import Elysia from 'elysia'
import { Ok, ok } from 'neverthrow'
import * as R from 'remeda'

import { GetFeedContentResponse } from './models'

import { FileServicePlugin } from '../../plugins/file'
import { PrismaServicePlugin } from '../../plugins/prisma'

export class FeedRepository {
  constructor(
    private prismaService: PrismaService,
    private fileService: FileService
  ) {}

  private constructResultWithMeta<T extends { id: string }>(
    data: T[],
    config: {
      needShuffle?: boolean
      limit: number
      cursor?: string
    }
  ) {
    return {
      items: config.needShuffle ? R.shuffle(data) : data,
      meta: {
        cursor: {
          next: data.length === config.limit ? data[config.limit - 1].id : null,
          previous: config.cursor || null,
        },
      },
    }
  }

  private ensureFeedItemExists = async (feedItemId: string, tx?: Prisma.TransactionClient) => {
    const queryStm = {
      where: {
        id: feedItemId,
        publishedAt: {
          lte: new Date(),
        },
        OR: [
          { post: { status: PostStatus.PUBLISHED } },
          { poll: { status: PollStatus.PUBLISHED } },
          {
            announcement: { status: AnnouncementStatus.PUBLISHED },
          },
        ],
      },
    }
    if (tx) await tx.feedItem.findUniqueOrThrow(queryStm)
    else await this.prismaService.feedItem.findUniqueOrThrow(queryStm)
  }

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
        where: {
          status: AnnouncementStatus.PUBLISHED,
        },
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
            orderBy: {
              id: 'asc',
            },
          },
        },
        where: {
          status: PollStatus.PUBLISHED,
        },
      },
      post: {
        where: {
          status: PostStatus.PUBLISHED,
        },
        include: {
          hashTags: {
            include: {
              hashTag: true,
            },
            where: {
              hashTag: {
                status: HashTagStatus.PUBLISHED,
              },
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
      commentCount: rawFeedItem.numberOfComments,
      userReaction: rawFeedItem.reactions?.[0]?.type ?? null,
      reactions: rawFeedItem.reactionCounts,
      publishedAt: rawFeedItem.publishedAt!,
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
            type: rawFeedItem.poll.type,
            options: rawFeedItem.poll.options.map((option) => ({
              id: option.id,
              title: option.title,
              isSelected: (option.pollAnswers ?? []).length > 0,
              votes: option.votes,
            })),
            endAt: rawFeedItem.poll.endAt,
            totalVotes: rawFeedItem.poll.totalVotes,
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
    cursor,
    limit,
  }: {
    userId?: string
    topicId: string
    cursor?: string
    limit: number
  }) {
    const rawFeedItems = await fromRepositoryPromise(
      this.prismaService.feedItem.findMany({
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor
          ? {
              id: cursor,
            }
          : undefined,
        orderBy: [
          {
            publishedAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        where: {
          type: {
            not: FeedItemType.ANNOUNCEMENT,
          },
          publishedAt: {
            lte: new Date(),
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
                      status: HashTagStatus.PUBLISHED,
                    },
                  },
                },
                status: PostStatus.PUBLISHED,
              },
            },
            {
              poll: {
                topics: {
                  some: {
                    topic: {
                      id: topicId,
                      status: TopicStatus.PUBLISHED,
                    },
                  },
                },
                status: PollStatus.PUBLISHED,
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

    const transformedFeedItems = feedItems.map(
      (feedItem) => (feedItem as Ok<FeedItem, never>).value
    )

    return ok(
      this.constructResultWithMeta(transformedFeedItems, {
        needShuffle: false,
        limit,
        cursor,
      })
    )
  }

  async listHashTagFeedItems({
    userId,
    hashTagId,
    cursor,
    limit,
  }: {
    userId?: string
    hashTagId: string
    cursor?: string
    limit: number
  }) {
    const rawFeedItems = await fromRepositoryPromise(
      this.prismaService.feedItem.findMany({
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor
          ? {
              id: cursor,
            }
          : undefined,
        orderBy: [
          {
            publishedAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        where: {
          publishedAt: {
            lte: new Date(),
          },
          OR: [
            {
              post: {
                hashTags: {
                  some: {
                    hashTag: {
                      id: hashTagId,
                      status: HashTagStatus.PUBLISHED,
                    },
                  },
                },
                status: PostStatus.PUBLISHED,
              },
            },
            {
              poll: {
                topics: {
                  some: {
                    topic: {
                      hashTags: {
                        some: {
                          hashTagId,
                        },
                      },
                      status: TopicStatus.PUBLISHED,
                    },
                  },
                },
                status: PollStatus.PUBLISHED,
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

    const transformedFeedItems = feedItems.map(
      (feedItem) => (feedItem as Ok<FeedItem, never>).value
    )

    return ok(
      this.constructResultWithMeta(transformedFeedItems, {
        needShuffle: false,
        limit,
        cursor,
      })
    )
  }

  async listFeedItems({
    userId,
    cursor,
    limit,
  }: {
    userId?: string
    cursor?: string
    limit: number
  }) {
    const rawFeedItems = await fromRepositoryPromise(async () => {
      if (!userId) {
        return await this.prismaService.feedItem.findMany({
          where: {
            type: {
              not: FeedItemType.ANNOUNCEMENT,
            },
            publishedAt: {
              lte: new Date(),
            },
          },
          orderBy: [
            {
              publishedAt: 'desc',
            },
            {
              id: 'desc',
            },
          ],
          skip: cursor ? 1 : 0,
          cursor: cursor
            ? {
                id: cursor,
              }
            : undefined,
          take: limit,
          include: this.constructFeedItemInclude(userId),
        })
      }

      const existingFeedItemScore = await this.prismaService.feedItemScore.findFirst({
        where: { userId, expiresAt: { gt: new Date() } },
        select: { feedItemId: true },
      })

      if (!existingFeedItemScore) {
        const candidateFeedItem = await this.prismaService.$queryRawTyped(
          get_candidate_feed_item(userId)
        )

        const candidateFeedItemIds = R.pipe(
          candidateFeedItem,
          R.filter((item) => item.feed_item_id !== null && item.score !== null),
          R.map((item) => ({
            feedItemId: item.feed_item_id!,
            score: item.score!,
            expiresAt: dayjs().add(1, 'hour').toDate(),
          }))
        )

        await this.prismaService.user.update({
          where: { id: userId },
          data: {
            feedItemScores: { deleteMany: {}, createMany: { data: candidateFeedItemIds } },
          },
        })
      }

      const feedItemScore = await this.prismaService.feedItemScore.findMany({
        where: {
          userId,
          expiresAt: { gt: new Date() },
          feedItem: {
            publishedAt: {
              lte: new Date(),
            },
            OR: [
              { post: { status: PostStatus.PUBLISHED } },
              { poll: { status: PollStatus.PUBLISHED } },
              {
                announcement: { status: AnnouncementStatus.PUBLISHED },
              },
            ],
          },
        },
        select: {
          feedItem: {
            include: this.constructFeedItemInclude(userId),
          },
        },
        orderBy: [
          {
            score: 'desc',
          },
          {
            userId: 'desc',
          },
          {
            feedItemId: 'desc',
          },
        ],
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor
          ? {
              userId_feedItemId: {
                userId,
                feedItemId: cursor,
              },
            }
          : undefined,
      })

      return R.pipe(
        feedItemScore,
        R.map((item) => item.feedItem)
      )
    })

    if (rawFeedItems.isErr()) return err(rawFeedItems.error)

    const feedItems = rawFeedItems.value.map((item) => this.transformToFeedItem(item))
    const feedItemErr = feedItems.find((item) => item.isErr())

    if (feedItemErr) {
      return err(feedItemErr.error)
    }

    const transformedFeedItems = feedItems.map(
      (feedItem) => (feedItem as Ok<FeedItem, never>).value
    )

    return ok(
      this.constructResultWithMeta(transformedFeedItems, {
        needShuffle: true,
        limit,
        cursor,
      })
    )
  }

  async listFeedItemsByUserId(
    userId: string | undefined,
    query: { cursor?: string; limit: number }
  ) {
    const rawFeedItems = await fromRepositoryPromise(async () => {
      await this.prismaService.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true },
      })

      return await this.prismaService.feedItem.findMany({
        orderBy: [
          {
            publishedAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        skip: query.cursor ? 1 : 0,
        take: query.limit,
        cursor: query.cursor ? { id: query.cursor } : undefined,
        where: {
          authorId: userId,
          publishedAt: {
            lte: new Date(),
          },
          type: {
            not: FeedItemType.ANNOUNCEMENT,
          },
          OR: [
            { post: { status: PostStatus.PUBLISHED } },
            { poll: { status: PollStatus.PUBLISHED } },
          ],
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

    const transformedFeedItems = feedItems.map(
      (feedItem) => (feedItem as Ok<FeedItem, never>).value
    )

    return ok(
      this.constructResultWithMeta(transformedFeedItems, {
        needShuffle: false,
        limit: query.limit,
        cursor: query.cursor,
      })
    )
  }

  async getFeedItemById(feedItemId: string, userId?: string) {
    const rawFeedItem = await fromRepositoryPromise(
      this.prismaService.feedItem.findUniqueOrThrow({
        where: {
          id: feedItemId,
          publishedAt: {
            lte: new Date(),
          },
          OR: [
            { post: { status: PostStatus.PUBLISHED } },
            { poll: { status: PollStatus.PUBLISHED } },
            {
              announcement: { status: AnnouncementStatus.PUBLISHED },
            },
          ],
        },
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
        orderBy: [
          {
            publishedAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        include: this.constructFeedItemInclude(userId),
        where: {
          publishedAt: {
            lte: new Date(),
          },
          OR: [
            {
              author: {
                followers: {
                  some: {
                    followerId: userId,
                  },
                },
              },
              post: {
                status: PostStatus.PUBLISHED,
                hashTags: {
                  some: {
                    hashTag: {
                      hashTagInTopics: {
                        some: {
                          topic: {
                            followers: {
                              some: {
                                userId,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            {
              poll: {
                status: PollStatus.PUBLISHED,
                topics: {
                  some: {
                    topic: {
                      followers: {
                        some: {
                          userId,
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
        },
      })
    )

    if (rawFeedItems.isErr()) return err(rawFeedItems.error)

    const feedItems = rawFeedItems.value.map((item) => this.transformToFeedItem(item))
    const feedItemErr = feedItems.find((item) => item.isErr())

    if (feedItemErr) {
      return err(feedItemErr.error)
    }

    const transformedFeedItems = feedItems.map(
      (feedItem) => (feedItem as Ok<FeedItem, never>).value
    )

    return ok(
      this.constructResultWithMeta(transformedFeedItems, {
        needShuffle: false,
        limit,
        cursor,
      })
    )
  }

  async getFeedItemReactionByUserId({
    feedItemId,
    userId,
  }: {
    feedItemId: string
    userId: string
  }) {
    return await fromRepositoryPromise(async () => {
      await this.ensureFeedItemExists(feedItemId)

      return await this.prismaService.feedItemReaction.findUnique({
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
    })
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
        await this.ensureFeedItemExists(feedItemId, tx)

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
        await this.ensureFeedItemExists(feedItemId, tx)

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
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            id: 'desc',
          },
        ],
        where: {
          feedItemId,
          feedItem: {
            publishedAt: {
              lte: new Date(),
            },
            OR: [
              { post: { status: PostStatus.PUBLISHED } },
              { poll: { status: PollStatus.PUBLISHED } },
              {
                announcement: { status: AnnouncementStatus.PUBLISHED },
              },
            ],
          },
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
      this.prismaService.$transaction(async (tx) => {
        await this.ensureFeedItemExists(feedItemId, tx)

        return await Promise.all([
          tx.feedItemComment.create({
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
          tx.feedItem.update({
            where: { id: feedItemId },
            data: {
              numberOfComments: { increment: 1 },
            },
          }),
        ])
      })
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
      this.prismaService.$transaction(async (tx) => {
        await this.ensureFeedItemExists(feedItemId, tx)

        return await tx.feedItemComment.update({
          where: {
            id: commentId,
            feedItemId,
            userId,
          },
          data: {
            content,
          },
        })
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
      this.prismaService.$transaction(async (tx) => {
        await this.ensureFeedItemExists(feedItemId, tx)

        return await this.prismaService.feedItemComment.delete({
          where: {
            id: commentId,
            userId,
            feedItem: {
              id: feedItemId,
            },
          },
        })
      })
    )
  }

  async checkTopicExists(topicId: string) {
    return await fromRepositoryPromise(
      this.prismaService.topic.findUniqueOrThrow({
        where: { id: topicId, status: TopicStatus.PUBLISHED },
      })
    )
  }

  async checkHashTagExists(hashTagId: string) {
    return await fromRepositoryPromise(
      this.prismaService.hashTag.findUniqueOrThrow({
        where: { id: hashTagId, status: HashTagStatus.PUBLISHED },
      })
    )
  }
}

export const FeedRepositoryPlugin = new Elysia({ name: 'FeedRepository' })
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    feedRepository: new FeedRepository(prismaService, fileService),
  }))
