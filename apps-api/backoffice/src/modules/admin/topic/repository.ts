import Elysia from 'elysia'

import { UpdateTopicBody } from './models'

import { PrismaService, PrismaServicePlugin } from '../../../plugins/prisma'
import { err } from '../../../utils/error'
import { fromRepositoryPromise } from '../../../utils/error'
import { FileService, FileServicePlugin } from '../../file/services'

export class AdminTopicRepository {
  constructor(
    private prismaService: PrismaService,
    private readonly fileService: FileService
  ) {}

  async getTopics(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const { limit, page } = query
    const skip = Math.max((page - 1) * limit, 0)

    return fromRepositoryPromise(
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
    return await fromRepositoryPromise(async () => {
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

      const data = await this.fileService.getFileSignedUrl(result.bannerImage ?? '')
      if (data.isErr()) return err(data.error)

      return {
        ...result,
        hashtags: hashTagInTopics.map((hashTagInTopic) => hashTagInTopic.hashTag),
      }
    })
  }

  async createEmptyTopic() {
    return await fromRepositoryPromise(
      this.prismaService.topic.create({
        data: {
          name: '',
          description: null,
          bannerImage: null,
        },
      })
    )
  }

  async updateTopicById(topicId: string, data: UpdateTopicBody) {
    return await fromRepositoryPromise(
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
    return await fromRepositoryPromise(
      this.prismaService.topic.delete({
        where: { id: topicId },
      })
    )
  }
}

export const AdminTopicRepositoryPlugin = new Elysia({
  name: 'AdminTopicRepository',
})
  .use([PrismaServicePlugin, FileServicePlugin])
  .decorate(({ prismaService, fileService }) => ({
    adminTopicRepository: new AdminTopicRepository(prismaService, fileService),
  }))
