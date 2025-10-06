import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { PrismaService } from '@pple-today/api-common/services'
import { err, fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { PostPollBody, PutPollBody } from './models'

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

  async getPolls(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const { limit, page } = query
    const skip = page ? (page - 1) * limit : 0

    return await fromRepositoryPromise(async () =>
      (
        await this.prismaService.poll.findMany({
          select: {
            feedItemId: true,
            title: true,
            description: true,
            status: true,
            endAt: true,
            type: true,
            feedItem: {
              select: {
                createdAt: true,
                updatedAt: true,
                publishedAt: true,
              },
            },
          },
          take: limit,
          skip,
          orderBy: {
            feedItem: {
              createdAt: 'desc',
            },
          },
        })
      ).map(({ feedItemId, feedItem, ...item }) => ({
        id: feedItemId,
        createdAt: feedItem.createdAt,
        updatedAt: feedItem.updatedAt,
        publishedAt: feedItem.publishedAt,
        ...item,
      }))
    )
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

  async updatePollById(feedItemId: string, data: PutPollBody) {
    return await fromRepositoryPromise(async () => {
      const answer = await this.prismaService.poll.findUniqueOrThrow({
        where: { feedItemId },
        select: {
          options: {
            select: {
              votes: true,
            },
          },
        },
      })

      const hasAnswer = answer.options.some((pollOption) => pollOption.votes > 0)

      if (hasAnswer) throw new Error('Cannot update poll with answers')

      return await this.prismaService.poll.update({
        where: { feedItemId },
        data: {
          title: data.title,
          description: data.description,
          endAt: data.endAt,
          type: data.type,
          topics: {
            deleteMany: {},
            createMany: {
              data: data.topicIds.map((topicId) => ({
                topicId,
              })),
            },
          },
          options: {
            deleteMany: {},
            createMany: {
              data: data.optionTitles.map((optionTitle) => ({
                title: optionTitle,
              })),
            },
          },
        },
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
