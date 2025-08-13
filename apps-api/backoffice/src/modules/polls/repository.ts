import { Elysia } from 'elysia'

import { FeedItemType, Prisma } from '../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromRepositoryPromise } from '../../utils/error'

export class PollsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch all published polls prioritized by
   * - nearest end date
   * - latest creation date if end dates already passed
   */
  async getPolls(query: { limit: number; page: number; userId?: string }) {
    const { limit, page } = query
    const skip = (page - 1) * limit
    const commonQueryParams = {
      include: {
        author: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            role: true,
            district: true,
          },
        },
        reactionCounts: {
          select: {
            type: true,
            count: true,
          },
        },
        poll: {
          include: {
            options: {
              include: {
                pollAnswers: query.userId
                  ? {
                      where: {
                        userId: query.userId,
                      },
                    }
                  : undefined,
              },
            },
          },
        },
      },
    } satisfies Prisma.FeedItemFindManyArgs

    return fromRepositoryPromise(async () => {
      const polls = []

      // Fetch total poll count
      const totalPollCount = await this.prisma.poll.count()

      // If skip is greater than total count, return empty array
      if (totalPollCount <= skip) {
        return []
      }

      // Fetch number of available polls that are not ended yet
      const availablePollCount = await this.prisma.feedItem.count({
        where: {
          type: FeedItemType.POLL,
          poll: {
            endAt: {
              gte: new Date(),
            },
          },
        },
      })

      // If skip is less than available poll count, fetch available polls first
      if (availablePollCount > skip) {
        const availablePolls = await this.prisma.feedItem.findMany({
          where: {
            type: FeedItemType.POLL,
            poll: {
              endAt: {
                gte: new Date(),
              },
            },
          },
          take: limit,
          skip,
          orderBy: { poll: { endAt: 'asc' } },
          ...commonQueryParams,
        })

        polls.push(...availablePolls)
      }

      const endedPollPosition = skip + limit - availablePollCount

      // If we need to fetch ended polls and the position is valid
      if (endedPollPosition > 0) {
        // Calculate the skip position for ended polls
        const endedPollSkip = ~~((endedPollPosition - 1) / limit) * limit
        const endedPolls = await this.prisma.feedItem.findMany({
          where: {
            type: FeedItemType.POLL,
            poll: {
              endAt: {
                lt: new Date(),
              },
            },
          },
          take: Math.min(limit, endedPollPosition),
          skip: endedPollSkip,
          orderBy: { createdAt: 'desc' },
          ...commonQueryParams,
        })

        polls.push(...endedPolls)
      }

      return polls
    })
  }

  async getPollCondition(userId: string, pollId: string) {
    return fromRepositoryPromise(async () => {
      const existingVote = await this.prisma.poll.findFirstOrThrow({
        where: {
          feedItemId: pollId,
        },
        select: {
          type: true,
          endAt: true,
          options: {
            select: {
              pollAnswers: {
                where: {
                  userId,
                },
                select: {
                  id: true,
                },
              },
            },
          },
        },
      })

      const numberOfVotes = existingVote.options.reduce(
        (acc, option) => acc + (option.pollAnswers ?? []).length,
        0
      )

      return {
        type: existingVote.type,
        endAt: existingVote.endAt,
        numberOfVotes,
      }
    })
  }

  async createPollVote(userId: string, pollId: string, optionId: string) {
    return fromRepositoryPromise(
      this.prisma.pollOption.update({
        where: {
          id: optionId,
          poll: {
            feedItemId: pollId,
          },
        },
        data: {
          votes: {
            increment: 1,
          },
          pollAnswers: {
            create: {
              user: {
                connect: {
                  id: userId,
                },
              },
            },
          },
        },
      })
    )
  }

  async deletePollVote(userId: string, pollId: string, optionId: string) {
    return fromRepositoryPromise(
      this.prisma.pollOption.update({
        where: {
          id: optionId,
          pollId,
        },
        data: {
          votes: {
            decrement: 1,
          },
          pollAnswers: {
            delete: {
              userId_optionId: {
                userId,
                optionId,
              },
            },
          },
        },
      })
    )
  }
}

export const PollsRepositoryPlugin = new Elysia({
  name: 'PollsRepository',
})
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    pollsRepository: new PollsRepository(prismaService),
  }))
