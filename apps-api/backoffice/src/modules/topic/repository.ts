import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { PrismaServicePlugin } from '../../plugins/prisma'

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

  async getHashtagById(hashtagId: string) {
    return fromRepositoryPromise(
      this.prismaService.hashTag.findFirstOrThrow({
        where: {
          id: hashtagId,
          status: 'PUBLISH',
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          hashTagInTopics: {
            select: {
              topic: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      })
    )
  }
}

export const TopicRepositoryPlugin = new Elysia({ name: 'TopicRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    topicRepository: new TopicRepository(prismaService),
  }))
