import { Elysia } from 'elysia'
import { ok } from 'neverthrow'

import { FeedItemType } from '../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export class PollsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getPolls(query: { limit: number; page: number; userId?: string }) {
    const { limit, page } = query
    const skip = (page - 1) * limit

    return fromPrismaPromise(
      this.prisma.feedItem.findMany({
        where: {
          type: FeedItemType.POLL,
        },
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
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
      })
    )
  }

  async createPollVote(userId: string, pollId: string, optionId: string) {
    return fromPrismaPromise(async () => {
      const existingVote = await this.prisma.poll.findFirstOrThrow({
        where: {
          feedItemId: pollId,
        },
        select: {
          type: true,
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
        (acc, option) => acc + option.pollAnswers.length,
        0
      )
      const isAllowedToVote = existingVote.type === 'SINGLE_CHOICE' ? numberOfVotes < 1 : true

      if (isAllowedToVote) {
        await this.prisma.pollOption.update({
          where: {
            id: optionId,
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
      }

      return ok()
    })
  }

  async deletePollVote(userId: string, pollId: string, optionId: string) {
    return fromPrismaPromise(
      this.prisma.pollOption.update({
        where: {
          id: optionId,
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
