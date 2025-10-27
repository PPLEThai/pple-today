import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { HashTagStatus, Prisma, TopicStatus } from '@pple-today/database/prisma'
import { get_candidate_topic } from '@pple-today/database/prisma/sql'
import Elysia from 'elysia'
import * as R from 'remeda'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class TopicRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private ensureTopicExists = async (topicId: string, tx: Prisma.TransactionClient) => {
    await tx.topic.findUniqueOrThrow({
      where: {
        id: topicId,
        status: TopicStatus.PUBLISHED,
      },
    })
  }

  async getTopicRecommendation(userId: string) {
    return fromRepositoryPromise(async () => {
      const candidateTopicIds = await this.prismaService.$queryRawTyped(get_candidate_topic(userId))

      const candidateTopic = await this.prismaService.topic.findMany({
        where: {
          id: {
            in: R.pipe(
              candidateTopicIds,
              R.map(R.prop('topic_id')),
              R.filter((id) => id !== null)
            ),
          },
          status: TopicStatus.PUBLISHED,
        },
        select: {
          id: true,
          name: true,
          description: true,
          bannerImagePath: true,
          hashTags: {
            where: { hashTag: { status: HashTagStatus.PUBLISHED } },
            include: {
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

      return candidateTopic.map((topic) => ({
        ...topic,
        hashTags: topic.hashTags.map((htt) => ({
          id: htt.hashTag.id,
          name: htt.hashTag.name,
        })),
      }))
    })
  }

  async getTopicById(topicId: string) {
    return fromRepositoryPromise(
      this.prismaService.topic.findFirstOrThrow({
        where: {
          id: topicId,
          status: TopicStatus.PUBLISHED,
        },
        include: {
          hashTags: {
            where: { hashTag: { status: HashTagStatus.PUBLISHED } },
            include: {
              hashTag: true,
            },
          },
        },
      })
    )
  }
  async getTopicByIds(topicIds: string[]) {
    return fromRepositoryPromise(
      this.prismaService.topic.findMany({
        where: {
          id: { in: topicIds },
          status: TopicStatus.PUBLISHED,
        },
        select: { id: true, name: true },
      })
    )
  }

  async getTopics() {
    return fromRepositoryPromise(
      this.prismaService.topic.findMany({
        where: { status: TopicStatus.PUBLISHED },
        include: {
          hashTags: {
            where: { hashTag: { status: HashTagStatus.PUBLISHED } },
            include: {
              hashTag: true,
            },
          },
        },
      })
    )
  }

  async listTopicWithFollowedStatus(userId: string) {
    return fromRepositoryPromise(
      this.prismaService.topic.findMany({
        where: { status: TopicStatus.PUBLISHED },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          followers: { where: { userId }, select: { userId: true } },
        },
      })
    )
  }

  async getUserFollowedTopics(userId: string) {
    return fromRepositoryPromise(
      this.prismaService.userFollowsTopic.findMany({
        where: {
          userId,
          topic: { status: TopicStatus.PUBLISHED },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          topic: {
            include: {
              hashTags: {
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
      this.prismaService.$transaction(async (tx) => {
        await this.ensureTopicExists(topicId, tx)

        return await this.prismaService.user.update({
          where: {
            id: userId,
          },
          data: {
            followingTopics: {
              create: {
                topicId,
              },
            },
            numberOfFollowingTopics: {
              increment: 1,
            },
          },
        })
      })
    )
  }

  async deleteUserFollowTopic(userId: string, topicId: string) {
    return fromRepositoryPromise(
      this.prismaService.$transaction(async (tx) => {
        await this.ensureTopicExists(topicId, tx)

        return await this.prismaService.user.update({
          where: {
            id: userId,
          },
          data: {
            followingTopics: {
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
      })
    )
  }
}

export const TopicRepositoryPlugin = new Elysia({ name: 'TopicRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    topicRepository: new TopicRepository(prismaService),
  }))
