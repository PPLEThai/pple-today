import { Elysia } from 'elysia'

import { FeedItemType, Prisma } from '../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export class PollsRepository {
  constructor(private readonly prisma: PrismaService) {}

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

    return fromPrismaPromise(async () => {
      const polls = []
      const totalPollCount = await this.prisma.poll.count()

      if (totalPollCount <= skip) {
        return []
      }

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

      if (endedPollPosition > 0) {
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
    return fromPrismaPromise(async () => {
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
    return fromPrismaPromise(
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
    return fromPrismaPromise(
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
