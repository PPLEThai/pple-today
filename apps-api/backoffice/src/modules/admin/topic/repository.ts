import Elysia from 'elysia'

import { CreateTopicBody, UpdateTopicBody } from './models'

import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { fromPrismaPromise } from '../../../utils/prisma'

export class AdminTopicRepository {
  constructor(private prismaService: PrismaService) {}

  async getTopics(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const { limit, page } = query
    const skip = Math.max((page - 1) * limit, 0)

    return fromPrismaPromise(
      this.prismaService.topic.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
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

  async getTopicById(topicId: string) {
    return await fromPrismaPromise(async () => {
      const { hashTagInTopics, ...result } = await this.prismaService.topic.findUniqueOrThrow({
        where: { id: topicId },
        select: {
          id: true,
          name: true,
          description: true,
          bannerImage: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          hashTagInTopics: {
            select: {
              hashTag: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })

      return {
        ...result,
        hashtags: hashTagInTopics.map((hashTagInTopic) => hashTagInTopic.hashTag),
      }
    })
  }

  async createTopic(data: CreateTopicBody) {
    return await fromPrismaPromise(
      this.prismaService.topic.create({
        data: {
          name: data.name,
          description: data.description,
          bannerImage: data.bannerImage,
          status: data.status,
          hashTagInTopics: {
            createMany: {
              data: data.hashtagIds.map((hashtagId) => ({
                hashTagId: hashtagId,
              })),
            },
          },
        },
      })
    )
  }

  async updateTopicById(topicId: string, data: UpdateTopicBody) {
    return await fromPrismaPromise(
      this.prismaService.topic.update({
        where: { id: topicId },
        data: {
          name: data.name,
          description: data.description,
          bannerImage: data.bannerImage,
          status: data.status,
          hashTagInTopics: {
            deleteMany: {},
            createMany: {
              data: data.hashtagIds.map((hashtagId) => ({
                hashTagId: hashtagId,
              })),
            },
          },
        },
      })
    )
  }

  async deleteTopicById(topicId: string) {
    return await fromPrismaPromise(
      this.prismaService.topic.delete({
        where: { id: topicId },
      })
    )
  }
}

export const AdminTopicRepositoryPlugin = new Elysia({
  name: 'AdminTopicRepository',
})
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    adminTopicRepository: new AdminTopicRepository(prismaService),
  }))
