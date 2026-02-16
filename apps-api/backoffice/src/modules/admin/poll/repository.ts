import { PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { FeedItemType, PollStatus } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { PostPollBody, UpdatePollBody } from './models'

import { PrismaServicePlugin } from '../../../plugins/prisma'
import { CommonRepository, CommonRepositoryPlugin } from '../../common/repository'

export class AdminPollRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly commonRepository: CommonRepository
  ) {}

  async getPolls(page: number, limit: number, status?: PollStatus[], search?: string) {
    const result = await fromRepositoryPromise(async () => {
      const [polls, count] = await Promise.all([
        await this.prismaService.feedItem.findMany({
          where: {
            type: FeedItemType.POLL,
            poll: {
              title: { contains: search, mode: 'insensitive' as const },
              status: { in: status },
            },
          },
          include: {
            poll: {
              select: {
                endAt: true,
                title: true,
                type: true,
                status: true,
                topics: true,
                totalVotes: true,
                options: {
                  select: {
                    id: true,
                    title: true,
                    votes: true,
                  },
                  orderBy: {
                    id: 'asc',
                  },
                },
              },
            },
            reactionCounts: true,
            _count: {
              select: {
                comments: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: Math.max((page - 1) * limit, 0),
          take: limit,
        }),
        await this.prismaService.poll.count({
          where: {
            title: { contains: search, mode: 'insensitive' as const },
            status: { in: status },
          },
        }),
      ])

      const transformPolls = polls
        .map((feed) => {
          if (!feed.poll) return null

          return {
            id: feed.id,
            title: feed.poll.title,
            type: feed.poll.type,
            reactions: feed.reactionCounts,
            commentCount: feed.numberOfComments,
            publishedAt: feed.publishedAt,
            createdAt: feed.createdAt,
            updatedAt: feed.updatedAt,
            totalVotes: feed.poll.totalVotes,
            endAt: feed.poll.endAt,
            status: feed.poll.status,
            options: feed.poll.options,
            topics: feed.poll.topics.flatMap((topic) => topic.topicId),
          }
        })
        .filter((item) => item !== null)

      return { transformPolls, count }
    })

    if (result.isErr()) {
      return err(result.error)
    }

    return ok({
      data: result.value.transformPolls,
      meta: {
        count: result.value.count,
      },
    })
  }

  async getPollDetailById(feedItemId: string) {
    return await fromRepositoryPromise(async () => {
      const feed = await this.prismaService.feedItem.findUniqueOrThrow({
        where: {
          id: feedItemId,
        },
        include: {
          poll: {
            select: {
              endAt: true,
              title: true,
              type: true,
              status: true,
              totalVotes: true,
              topics: {
                select: {
                  topicId: true,
                },
              },
              options: {
                select: {
                  id: true,
                  title: true,
                  votes: true,
                },
                orderBy: {
                  id: 'asc',
                },
              },
            },
          },
          reactionCounts: true,
          _count: {
            select: {
              comments: true,
            },
          },
        },
      })

      const transformPoll = {
        id: feed.id,
        title: feed.poll!.title,
        type: feed.poll!.type,
        reactions: feed.reactionCounts,
        commentCount: feed.numberOfComments,
        publishedAt: feed.publishedAt,
        createdAt: feed.createdAt,
        updatedAt: feed.updatedAt,
        totalVotes: feed.poll!.totalVotes,
        endAt: feed.poll!.endAt,
        status: feed.poll!.status,
        options: feed.poll!.options,
        topics: feed.poll!.topics.flatMap((topic) => topic.topicId),
      }

      return transformPoll
    })
  }

  async getPollOptionAnswersById(optionId: string) {
    return await fromRepositoryPromise(async () => {
      const option = await this.prismaService.pollOption.findUniqueOrThrow({
        where: {
          id: optionId,
        },
        include: {
          pollAnswers: {
            select: {
              id: true,
              createdAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  profileImagePath: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      })

      const transformAnswers = {
        id: option.id,
        title: option.title,
        votes: option.votes,
        answers: option.pollAnswers.map((answer) => ({
          id: answer.id,
          createdAt: answer.createdAt,
          user: {
            id: answer.user.id,
            name: answer.user.name,
            profileImage: answer.user.profileImagePath,
          },
        })),
      }

      return transformAnswers
    })
  }

  async createPoll(data: PostPollBody) {
    const officialUserId = await this.commonRepository.lookupOfficialUserId()

    if (officialUserId.isErr()) return err(officialUserId.error)

    return await fromRepositoryPromise(async () =>
      this.prismaService.feedItem.create({
        data: {
          type: 'POLL',
          author: {
            connect: {
              id: officialUserId.value,
            },
          },
          poll: {
            create: {
              title: data.title,
              description: data.description,
              endAt: data.endAt,
              type: data.type,
              topics: {
                createMany: {
                  data: data.topicIds.map((topicId) => ({
                    topicId,
                  })),
                },
              },
              options: {
                createMany: {
                  data: data.optionTitles.map((optionTitle) => ({
                    title: optionTitle,
                  })),
                },
              },
            },
          },
        },
        select: {
          id: true,
        },
      })
    )
  }

  async updatePollById(feedItemId: string, data: UpdatePollBody) {
    return await fromRepositoryPromise(async () => {
      return await this.prismaService.$transaction(async (tx) => {
        return tx.poll.update({
          where: { feedItemId },
          data: {
            title: data.title,
            description: data.description,
            endAt: data.endAt,
            type: data.type,
            ...(data.topicIds && {
              topics: {
                deleteMany: {},
                createMany: {
                  data: data.topicIds.map((topicId) => ({
                    topicId,
                  })),
                },
              },
            }),
            ...(data.optionTitles && {
              options: {
                deleteMany: {},
                createMany: {
                  data: data.optionTitles.map((optionTitle) => ({
                    title: optionTitle,
                  })),
                },
              },
            }),
            status: data.status,
            ...(data.status === PollStatus.PUBLISHED && {
              feedItem: {
                update: {
                  publishedAt: new Date(),
                },
              },
            }),
          },
        })
      })
    })
  }

  async deletePollById(feedItemId: string) {
    return await fromRepositoryPromise(
      this.prismaService.feedItem.delete({ where: { id: feedItemId } })
    )
  }
}

export const AdminPollRepositoryPlugin = new Elysia({
  name: 'AdminPollRepository',
})
  .use([PrismaServicePlugin, CommonRepositoryPlugin])
  .decorate(({ prismaService, commonRepository }) => ({
    adminPollRepository: new AdminPollRepository(prismaService, commonRepository),
  }))
