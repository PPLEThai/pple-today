import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { FeedItemType, PollStatus, PollType, Prisma } from '@pple-today/database/prisma'
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
                      orderBy: {
                        id: 'asc',
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
              gt: new Date(),
            },
          },
          publishedAt: {
            lte: new Date(),
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
                gt: new Date(),
              },
            },
            publishedAt: {
              lte: new Date(),
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
            publishedAt: {
              lte: new Date(),
            },
            poll: {
              status: PollStatus.PUBLISHED,
              endAt: {
                lte: new Date(),
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
          feedItem: {
            id: pollId,
            publishedAt: {
              lte: new Date(),
            },
          },
          status: PollStatus.PUBLISHED,
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

  async upsertPollVote(userId: string, pollId: string, options: string[], pollType: PollType) {
    return fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        // retrieve the existing vote
        const existingVotes = await tx.pollAnswer.findMany({
          where: {
            userId,
            option: {
              pollId: pollId,
            },
          },
        })

        // delete the existingVote if existingVote exist
        if (existingVotes.length > 0) {
          await tx.poll.update({
            where: {
              feedItemId: pollId,
              status: PollStatus.PUBLISHED,
            },
            data: {
              options: {
                update: existingVotes.map((vote) => ({
                  where: { id: vote.optionId },
                  data: {
                    votes: {
                      decrement: 1,
                    },
                    pollAnswers: {
                      delete: {
                        userId_optionId: {
                          userId,
                          optionId: vote.optionId,
                        },
                      },
                    },
                  },
                })),
              },
              totalVotes: {
                decrement: 1,
              },
            },
          })
        }

        if (pollType === 'SINGLE_CHOICE' && options.length === 1) {
          await tx.poll.update({
            where: {
              feedItemId: pollId,
              status: PollStatus.PUBLISHED,
            },
            data: {
              options: {
                update: {
                  where: {
                    id: options[0],
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
                        poll: {
                          connect: {
                            feedItemId: pollId,
                          },
                        },
                      },
                    },
                  },
                },
              },
              totalVotes: {
                increment: 1,
              },
            },
          })
        }

        if (pollType === 'MULTIPLE_CHOICE' && options.length > 0) {
          await tx.poll.update({
            where: {
              feedItemId: pollId,
              status: PollStatus.PUBLISHED,
            },
            data: {
              options: {
                update: options.map((id) => ({
                  where: { id: id },
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
                        poll: {
                          connect: {
                            feedItemId: pollId,
                          },
                        },
                      },
                    },
                  },
                })),
              },
              totalVotes: {
                increment: 1,
              },
            },
          })
        }

        // TODO: log the following process in term: <previous_options> to <new_options>
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
