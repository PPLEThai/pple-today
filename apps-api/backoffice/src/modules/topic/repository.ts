import Elysia from 'elysia'

import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'

export class TopicRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getTopics() {
    return fromPrismaPromise(
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
    return fromPrismaPromise(
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
}

export const TopicRepostoryPlugin = new Elysia({ name: 'TopicRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    topicRepository: new TopicRepository(prismaService),
  }))
