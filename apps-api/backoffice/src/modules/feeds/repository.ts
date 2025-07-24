import node from '@elysiajs/node'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { FeedItemReactionType, FeedItemType } from '../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export class FeedRepository {
  constructor(private prismaService: PrismaService) {}

  async getFeedItemReactionByUserId({
    feedItemId,
    userId,
  }: {
    feedItemId: string
    userId: string
  }) {
    return await fromPrismaPromise(
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
    return await fromPrismaPromise(
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
    return await fromPrismaPromise(
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
    return await fromPrismaPromise(
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
    query: { feedItemType: FeedItemType; userId?: string; page: number; limit: number }
  ) {
    return await fromPrismaPromise(
      this.prismaService.feedItemComment.findMany({
        where: {
          feedItemId,
          feedItem: { type: query.feedItemType },
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
    const result = await fromPrismaPromise(
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
    return await fromPrismaPromise(
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
    return await fromPrismaPromise(
      this.prismaService.feedItemComment.deleteMany({
        where: {
          id: commentId,
          userId,
          feedItemId,
        },
      })
    )
  }
}

export const FeedRepositoryPlugin = new Elysia({
  adapter: node(),
})
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    feedRepository: new FeedRepository(prismaService),
  }))
