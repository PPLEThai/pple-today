import Elysia from 'elysia'

import { PutDraftPollBody, PutPublishedPollBody } from './models'

import { FeedItemType, PollType } from '../../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { fromRepositoryPromise } from '../../../utils/error'

export class AdminPollRepository {
  constructor(private prismaService: PrismaService) {}

  async getAllPolls() {
    return await fromRepositoryPromise(async () => {
      const [draft, published] = await Promise.all([
        this.prismaService.pollDraft.findMany({
          select: {
            id: true,
            title: true,
            description: true,
            endAt: true,
            type: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prismaService.poll.findMany({
          select: {
            feedItemId: true,
            title: true,
            description: true,
            endAt: true,
            type: true,
            feedItem: {
              select: {
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        }),
      ])

      return [
        ...draft,
        ...published.map(({ feedItemId, feedItem, ...item }) => ({
          id: feedItemId,
          createdAt: feedItem.createdAt,
          updatedAt: feedItem.updatedAt,
          ...item,
        })),
      ]
    })
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
            endAt: true,
            type: true,
            feedItem: {
              select: {
                createdAt: true,
                updatedAt: true,
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
          endAt: true,
          type: true,
          feedItem: {
            select: {
              createdAt: true,
              updatedAt: true,
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

  async updatePollById(feedItemId: string, data: PutPublishedPollBody) {
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

  async unpublishPollById(feedItemId: string) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        // 1. Get poll
        const poll = await tx.poll.findUniqueOrThrow({
          where: { feedItemId },
          select: {
            title: true,
            description: true,
            endAt: true,
            type: true,
            topics: { select: { topicId: true } },
            options: { select: { title: true, votes: true } },
          },
        })

        if (poll === null) throw new Error('Missing required fields')

        // 2. Insert into draft poll
        const draftPoll = await tx.pollDraft.create({
          data: {
            id: feedItemId,
            title: poll.title,
            description: poll.description,
            endAt: poll.endAt,
            type: poll.type,
            topics: { createMany: { data: poll.topics } },
            options: { createMany: { data: poll.options } },
          },
        })

        // 3. Delete poll
        await tx.feedItem.delete({ where: { id: feedItemId } })

        return draftPoll
      })
    )
  }

  async deletePollById(feedItemId: string) {
    return await fromRepositoryPromise(
      this.prismaService.feedItem.delete({ where: { id: feedItemId } })
    )
  }

  async getDraftPolls(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const { limit, page } = query
    const skip = page ? (page - 1) * limit : 0

    return await fromRepositoryPromise(
      this.prismaService.pollDraft.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          endAt: true,
          type: true,
          createdAt: true,
          updatedAt: true,
        },
        take: limit,
        skip,
        orderBy: {
          createdAt: 'desc',
        },
      })
    )
  }

  async getDraftPollById(pollId: string) {
    return await fromRepositoryPromise(async () => {
      const { options, topics, ...result } = await this.prismaService.pollDraft.findUniqueOrThrow({
        where: { id: pollId },
        select: {
          id: true,
          title: true,
          description: true,
          endAt: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          options: {
            select: {
              title: true,
              votes: true,
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
        options: options.map((option) => ({
          title: option.title,
          votes: option.votes,
        })),
        topics: topics.map((topic) => topic.topicId),
        ...result,
      }
    })
  }

  async createEmptyDraftPoll() {
    return await fromRepositoryPromise(
      this.prismaService.pollDraft.create({ data: { type: PollType.SINGLE_CHOICE } })
    )
  }

  async updateDraftPollById(pollId: string, data: PutDraftPollBody) {
    return await fromRepositoryPromise(
      this.prismaService.pollDraft.update({
        where: { id: pollId },
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
    )
  }

  async publishDraftPollById(pollId: string, authorId: string) {
    return await fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        // 1. Get draft poll
        // const draftPoll = await this.getDraftPollById(pollId)
        const draftPoll = await tx.pollDraft.findUniqueOrThrow({
          where: { id: pollId },
          select: {
            id: true,
            title: true,
            description: true,
            endAt: true,
            type: true,
            topics: { select: { topicId: true } },
            options: { select: { title: true, votes: true } },
          },
        })

        if (draftPoll.title === null || draftPoll.endAt === null)
          throw new Error('Missing required fields')

        // 2. Insert into feed
        const feedItem = await tx.feedItem.create({
          data: {
            id: draftPoll.id,
            type: FeedItemType.POLL,
            authorId,
            poll: {
              create: {
                title: draftPoll.title,
                description: draftPoll.description,
                endAt: draftPoll.endAt,
                type: draftPoll.type,
                topics: { createMany: { data: draftPoll.topics } },
                options: { createMany: { data: draftPoll.options } },
              },
            },
          },
        })

        // 3. Delete draft poll
        await tx.pollDraft.delete({ where: { id: pollId } })

        return feedItem
      })
    )
  }

  async deleteDraftPollById(pollId: string) {
    return await fromRepositoryPromise(
      this.prismaService.pollDraft.delete({ where: { id: pollId } })
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
