import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { FeedItemType, PollStatus } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { PostPollBody, UpdatePollBody } from './models'

import { PrismaServicePlugin } from '../../../plugins/prisma'

export class AdminPollRepository {
  private OFFICIAL_USER_ID: string | null = null

  constructor(private prismaService: PrismaService) {}

  private async lookupOfficialUserId() {
    if (this.OFFICIAL_USER_ID) {
      return ok(this.OFFICIAL_USER_ID)
    }

    const findOfficialResult = await fromRepositoryPromise(
      this.prismaService.user.findFirst({
        where: { roles: { every: { role: 'official' } } },
        select: { id: true },
      })
    )

    if (findOfficialResult.isErr()) {
      return err(findOfficialResult.error)
    }

    if (!findOfficialResult.value) {
      return err({
        message: 'Official user not found',
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
      })
    }

    this.OFFICIAL_USER_ID = findOfficialResult.value.id
    return ok(this.OFFICIAL_USER_ID)
  }

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
                options: {
                  select: {
                    title: true,
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

  async getPollById(feedItemId: string) {
    return await fromRepositoryPromise(async () => {
      const {
        feedItemId: id,
        feedItem,
        options,
        topics,
        ...result
      } = await this.prismaService.poll.findUniqueOrThrow({
        where: { feedItemId },
        select: {
          feedItemId: true,
          title: true,
          description: true,
          status: true,
          endAt: true,
          type: true,
          totalVotes: true,
          feedItem: {
            select: {
              createdAt: true,
              updatedAt: true,
              publishedAt: true,
            },
          },
          options: {
            select: {
              title: true,
              votes: true,
              pollAnswers: {
                select: {
                  createdAt: true,
                  user: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          topics: {
            select: {
              topicId: true,
            },
          },
        },
      })

      return {
        id,
        createdAt: feedItem.createdAt,
        updatedAt: feedItem.updatedAt,
        publishedAt: feedItem.publishedAt,
        options: options.map((option) => ({
          title: option.title,
          votes: option.votes,
          answers: option.pollAnswers.map((answer) => ({
            createdAt: answer.createdAt,
            username: answer.user.name,
          })),
        })),
        topics: topics.map((topic) => topic.topicId),
        ...result,
      }
    })
  }

  async createPoll(data: PostPollBody) {
    const officialUserId = await this.lookupOfficialUserId()

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
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    adminPollRepository: new AdminPollRepository(prismaService),
  }))
