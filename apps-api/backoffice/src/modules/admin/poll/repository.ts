import node from '@elysiajs/node'
import Elysia from 'elysia'

import { PutPollBody } from './models'

import { FeedItemType } from '../../../../__generated__/prisma'
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

  async updatePollById(feedItemId: string, data: PutPollBody) {
    return await fromPrismaPromise(async () => {
      const answers = await this.prismaService.poll.findMany({
        where: { feedItemId },
        select: {
          options: {
            select: {
              pollAnswers: true,
            },
          },
        },
      })

      if (answers.length > 0) throw new Error('Cannot update poll with answers')

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
            deleteMany: {
              pollId: feedItemId,
            },
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
        const feedPoll = await tx.feedItem.findUniqueOrThrow({
          where: { id: feedItemId },
          select: {
            id: true,
            poll: {
              select: {
                title: true,
                description: true,
                endAt: true,
                type: true,
                topics: { select: { topicId: true } },
                options: { select: { title: true, votes: true } },
              },
            },
          },
        })

        if (feedPoll.poll === null) throw new Error('Missing required fields')

        // 2. Insert into drafted poll
        const draftedPoll = await tx.pollDraft.create({
          data: {
            id: feedPoll.id,
            title: feedPoll.poll.title,
            description: feedPoll.poll.description,
            endAt: feedPoll.poll.endAt,
            type: feedPoll.poll.type,
            topics: { createMany: { data: feedPoll.poll.topics } },
            options: { createMany: { data: feedPoll.poll.options } },
          },
        })

        // 3. Delete poll
        await this.deletePollById(feedItemId)

        return draftedPoll
      })
    )
  }

  async deletePollById(feedItemId: string) {
    return await fromPrismaPromise(
      this.prismaService.feedItem.delete({ where: { id: feedItemId } }) // NOTE - let feed item delete cascade into poll
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
      this.prismaService.pollDraft.create({ data: { type: 'SINGLE_CHOICE' } })
    )
  }

  async updateDraftedPollById(pollId: string, data: PutPollBody) {
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
            deleteMany: {
              pollDraftId: pollId,
            },
            createMany: {
              data: data.optionTitles.map((optionTitle) => ({
                // pollDraftId: pollId,
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
        await this.deleteDraftedPollById(pollId)

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
