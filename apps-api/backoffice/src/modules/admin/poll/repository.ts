import node from '@elysiajs/node'
import Elysia from 'elysia'

import { PutPollBody } from './models'

import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'
import { FeedRepository, FeedRepositoryPlugin } from '../../feeds/repository'

export class PollRepository {
  constructor(
    private prismaService: PrismaService,
    private feedRepository: FeedRepository
  ) {}

  async getAllPolls() {
    return await fromPrismaPromise(async () => {
      const [rawDraft, rawPublished] = await Promise.all([
        this.prismaService.pollDraft.findMany(),
        this.prismaService.poll.findMany({
          include: {
            feedItem: {
              select: {
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        }),
      ])

      const draft = rawDraft.map((item) => ({
        id: item.id,

        title: item.title,
        description: item.description,
        endAt: item.endAt,
        type: item.type,

        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))

      const published = rawPublished.map((item) => ({
        id: item.feedItemId,

        title: item.title,
        description: item.description,
        endAt: item.endAt,
        type: item.type,

        createdAt: item.feedItem.createdAt,
        updatedAt: item.feedItem.updatedAt,
      }))

      return [...draft, ...published]
    })
  }

  async getPolls() {
    return await fromPrismaPromise(async () => {
      return (
        await this.prismaService.poll.findMany({
          include: {
            feedItem: {
              select: {
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        })
      ).map((item) => ({
        id: item.feedItemId,

        title: item.title,
        description: item.description,
        endAt: item.endAt,
        type: item.type,

        createdAt: item.feedItem.createdAt,
        updatedAt: item.feedItem.updatedAt,
      }))
    })
  }

  async getPollById(feedItemId: string) {
    return await fromPrismaPromise(async () => {
      const result = await this.prismaService.poll.findUniqueOrThrow({
        where: { feedItemId },
        include: {
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
        id: result.feedItemId,

        title: result.title,
        description: result.description,
        endAt: result.endAt,
        type: result.type,

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

  // ติดอะไรอยู่: เหมือนต้องสั่ง create feed อะ ซึ่งแปลว่าต้องกลับไปทำ feed ก่อน
  async unpublishPollById(feedItemId: string) {
    throw new Error('Not implemented')
    return await fromPrismaPromise(
      this.prismaService.$transaction(async (tx) => {
        // const poll = await tx.pollDraft.findUniqueOrThrow({
        //   where: { id: pollId },
        // })
      })
    )
  }

  async deletePollById(feedItemId: string) {
    return await fromPrismaPromise(
      this.prismaService.feedItem.delete({ where: { id: feedItemId } }) // NOTE - let feed item delete cascade into poll
    )
  }

  async getDraftedPolls() {
    return await fromPrismaPromise(async () =>
      (await this.prismaService.pollDraft.findMany()).map((item) => ({
        id: item.id,

        title: item.title,
        description: item.description,
        endAt: item.endAt,
        type: item.type,

        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }))
    )
  }

  async getDraftedPollById(pollId: string) {
    return await fromPrismaPromise(async () => {
      const result = await this.prismaService.pollDraft.findUniqueOrThrow({
        where: { id: pollId },
        include: { options: true, topics: true },
      })

      return {
        id: result.id,

        title: result.title,
        description: result.description,
        endAt: result.endAt,
        type: result.type,

        createdAt: result.createdAt,
        updatedAt: result.updatedAt,

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

  // ติดอะไรอยู่: เหมือนต้องสั่ง create feed อะ ซึ่งแปลว่าต้องกลับไปทำ feed ก่อน
  async publishDraftedPollById(pollId: string) {
    throw new Error('Not implemented')
    return await fromPrismaPromise(
      this.prismaService.$transaction(async (tx) => {
        const draftedPoll = await tx.pollDraft.findUniqueOrThrow({
          where: { id: pollId },
        })

        // insert into feed
        // await this.feedRepository.createFeedItem
      })
    )
  }

  async deleteDraftedPollById(pollId: string) {
    return await fromPrismaPromise(this.prismaService.pollDraft.delete({ where: { id: pollId } }))
  }
}

export const PollRepositoryPlugin = new Elysia({ name: 'PollRepository', adapter: node() })
  .use([PrismaServicePlugin, FeedRepositoryPlugin])
  .decorate(({ prismaService, feedRepository }) => ({
    pollRepository: new PollRepository(prismaService, feedRepository),
  }))
