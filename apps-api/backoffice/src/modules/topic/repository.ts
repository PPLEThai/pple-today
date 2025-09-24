import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { HashTagStatus, TopicStatus } from '@pple-today/database/prisma'
import { get_candidate_topic } from '@pple-today/database/prisma/sql'
import Elysia from 'elysia'
import * as R from 'remeda'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class TopicRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async getTopicRecommendation(userId: string) {
    return fromRepositoryPromise(async () => {
      const candidateTopic = await this.prismaService.$queryRawTyped(get_candidate_topic(userId))

      return R.pipe(
        candidateTopic,
        R.groupBy((ct) => ct.id),
        R.values(),
        R.map((grouped) => {
          const { id, name, description, bannerImagePath } = grouped[0]
          return {
            id,
            name,
            description,
            bannerImagePath,
            hashTags: R.pipe(
              grouped,
              R.map(
                (ct) =>
                  ct.hashTagId &&
                  ct.hashTagName && {
                    id: ct.hashTagId,
                    name: ct.hashTagName,
                  }
              ),
              R.filter((ht) => !!ht)
            ),
          }
        })
      )
    })
  }

  async getTopicById(topicId: string) {
    return fromRepositoryPromise(
      this.prismaService.topic.findFirstOrThrow({
        where: {
          id: topicId,
          status: HashTagStatus.PUBLISH,
        },
        include: {
          hashTagInTopics: {
            where: { hashTag: { status: HashTagStatus.PUBLISH } },
            include: {
              hashTag: true,
            },
          },
        },
      })
    )
  }

  async getTopics() {
    return fromRepositoryPromise(
      this.prismaService.topic.findMany({
        where: { status: TopicStatus.PUBLISH },
        include: {
          hashTagInTopics: {
            where: { hashTag: { status: HashTagStatus.PUBLISH } },
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
        where: { status: 'PUBLISH' },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          followedTopics: { where: { userId }, select: { userId: true } },
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
        orderBy: { createdAt: 'asc' },
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

export const TopicRepositoryPlugin = new Elysia({ name: 'TopicRepository' })
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    topicRepository: new TopicRepository(prismaService),
  }))
