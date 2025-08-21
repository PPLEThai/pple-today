import Elysia, { status } from 'elysia'
import { PrismaService, PrismaServicePlugin } from '../../plugins/prisma'
import { fromPrismaPromise } from '../../utils/prisma'
import { TopicStatus } from '../../../__generated__/prisma'

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
}

export const TopicRepostoryPlugin = new Elysia({ name: 'TopicRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    topicRepository: new TopicRepository(prismaService),
  }))
