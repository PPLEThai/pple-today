import { PrismaService, PrismaServicePlugin } from '@pple-today/api-common/plugins/prisma'
import Elysia from 'elysia'

import { fromRepositoryPromise } from '../../utils/error'

export class TopicRepository {
  constructor(private readonly prismaService: PrismaService) {}
  async getTopicById(topicId: string) {
    return fromRepositoryPromise(
      this.prismaService.topic.findFirstOrThrow({
        where: {
          id: topicId,
        },
      })
    )
  }

  async getTopics() {
    return fromRepositoryPromise(
      this.prismaService.topic.findMany({
        include: {
          hashTagInTopics: {
            include: {
              hashTag: true,
            },
          },
        },
      })
    )
  }

  async getUserFollowedTopics(userId: string) {
    return fromRepositoryPromise(
      this.prismaService.userFollowsTopic.findMany({
        where: {
          userId: { equals: userId },
        },
        include: {
          topic: {
            include: {
              hashTagInTopics: {
                include: {
                  hashTag: true,
                },
              },
            },
          },
        },
      })
    )
  }

  async createUserFollowTopic(userId: string, topicId: string) {
    return fromRepositoryPromise(
      this.prismaService.user.update({
        where: {
          id: userId,
        },
        data: {
          followedTopics: {
            create: {
              topicId,
            },
          },
          numberOfFollowingTopics: {
            increment: 1,
          },
        },
      })
    )
  }

  async deleteUserFollowTopic(userId: string, topicId: string) {
    return fromRepositoryPromise(
      this.prismaService.user.update({
        where: {
          id: userId,
        },
        data: {
          followedTopics: {
            delete: {
              userId_topicId: {
                userId,
                topicId,
              },
            },
          },
          numberOfFollowingTopics: {
            decrement: 1,
          },
        },
      })
    )
  }
}

export const TopicRepostoryPlugin = new Elysia({ name: 'TopicRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    topicRepository: new TopicRepository(prismaService),
  }))
