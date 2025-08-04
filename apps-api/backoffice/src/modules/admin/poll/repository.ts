import node from '@elysiajs/node'
import Elysia from 'elysia'

import { PutDraftedPollBody, PutPublishedPollBody } from './models'

import { FeedItemType, PollType } from '../../../../__generated__/prisma'
import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'

export class PollRepository {
  constructor(private prismaService: PrismaService) {}

  async getAllPolls() {
    return await fromPrismaPromise(async () => {
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
        ...published.map((item) => ({
          ...item,
          id: item.feedItemId,
          createdAt: item.feedItem.createdAt,
          updatedAt: item.feedItem.updatedAt,
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

    return await fromPrismaPromise(async () =>
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
      ).map((item) => ({
        ...item,
        id: item.feedItemId,
        createdAt: item.feedItem.createdAt,
        updatedAt: item.feedItem.updatedAt,
      }))
    )
  }

  async getPollById(feedItemId: string) {
    return await fromPrismaPromise(async () => {
      const result = await this.prismaService.poll.findUniqueOrThrow({
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
        ...result,
        id: result.feedItemId,
        createdAt: result.feedItem.createdAt,
        updatedAt: result.feedItem.updatedAt,
        options: result.options.map((option) => ({
          title: option.title,
          votes: option.votes,
          answers: option.pollAnswers.map((answer) => ({
            createdAt: answer.createdAt,
            username: answer.user.name,
          })),
        })),
        topics: result.topics.map((topic) => topic.topicId),
      }
    })
  }

  async updatePollById(feedItemId: string, data: PutPublishedPollBody) {
    return await fromPrismaPromise(async () => {
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
    return await fromPrismaPromise(
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

        // 2. Insert into drafted poll
        const draftedPoll = await tx.pollDraft.create({
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

        return draftedPoll
      })
    )
  }

  async deletePollById(feedItemId: string) {
    return await fromPrismaPromise(
      this.prismaService.feedItem.delete({ where: { id: feedItemId } })
    )
  }

  async getDraftedPolls(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const { limit, page } = query
    const skip = page ? (page - 1) * limit : 0

    return await fromPrismaPromise(
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

  async getDraftedPollById(pollId: string) {
    return await fromPrismaPromise(async () => {
      const result = await this.prismaService.pollDraft.findUniqueOrThrow({
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
        ...result,
        options: result.options.map((option) => ({
          title: option.title,
          votes: option.votes,
        })),
        topics: result.topics.map((topic) => topic.topicId),
      }
    })
  }

  async createEmptyDraftedPoll() {
    return await fromPrismaPromise(
      this.prismaService.pollDraft.create({ data: { type: PollType.SINGLE_CHOICE } })
    )
  }

  async updateDraftedPollById(pollId: string, data: PutDraftedPollBody) {
    return await fromPrismaPromise(
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

  async publishDraftedPollById(pollId: string, authorId: string) {
    return await fromPrismaPromise(
      this.prismaService.$transaction(async (tx) => {
        // 1. Get drafted poll
        // const draftedPoll = await this.getDraftedPollById(pollId)
        const draftedPoll = await tx.pollDraft.findUniqueOrThrow({
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

        if (draftedPoll.title === null || draftedPoll.endAt === null)
          throw new Error('Missing required fields')

        // 2. Insert into feed
        const feedItem = await tx.feedItem.create({
          data: {
            id: draftedPoll.id,
            type: FeedItemType.POLL,
            authorId,
            poll: {
              create: {
                title: draftedPoll.title,
                description: draftedPoll.description,
                endAt: draftedPoll.endAt,
                type: draftedPoll.type,
                topics: { createMany: { data: draftedPoll.topics } },
                options: { createMany: { data: draftedPoll.options } },
              },
            },
          },
        })

        // 3. Delete drafted poll
        await tx.pollDraft.delete({ where: { id: pollId } })

        return feedItem
      })
    )
  }

  async deleteDraftedPollById(pollId: string) {
    return await fromPrismaPromise(this.prismaService.pollDraft.delete({ where: { id: pollId } }))
  }
}

export const PollRepositoryPlugin = new Elysia({ name: 'PollRepository', adapter: node() })
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    pollRepository: new PollRepository(prismaService),
  }))
