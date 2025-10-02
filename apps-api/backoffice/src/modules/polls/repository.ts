import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { FeedItemType, PollStatus, Prisma } from '@pple-today/database/prisma'
import { Elysia } from 'elysia'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class PollsRepository {
  constructor(private readonly prismaService: PrismaService) {}

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
            profileImagePath: true,
            roles: true,
            district: true,
          },
        },
        reactionCounts: {
          select: {
            type: true,
            count: true,
          },
        },
        reactions: query.userId ? { where: { userId: query.userId } } : undefined,
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
      const totalPollCount = await this.prismaService.poll.count({
        where: {
          status: PollStatus.PUBLISHED,
        },
      })

      // If skip is greater than total count, return empty array
      if (totalPollCount <= skip) {
        return []
      }

      // Fetch number of available polls that are not ended yet
      const availablePollCount = await this.prismaService.feedItem.count({
        where: {
          type: FeedItemType.POLL,
          poll: {
            status: PollStatus.PUBLISHED,
            endAt: {
              gte: new Date(),
            },
          },
        },
      })

      // If skip is less than available poll count, fetch available polls first
      if (availablePollCount > skip) {
        const availablePolls = await this.prismaService.feedItem.findMany({
          where: {
            type: FeedItemType.POLL,
            poll: {
              status: PollStatus.PUBLISHED,
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
        const endedPolls = await this.prismaService.feedItem.findMany({
          where: {
            type: FeedItemType.POLL,
            poll: {
              status: PollStatus.PUBLISHED,
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
      const existingVote = await this.prismaService.poll.findFirstOrThrow({
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
      this.prismaService.pollOption.update({
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
      this.prismaService.pollOption.update({
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
