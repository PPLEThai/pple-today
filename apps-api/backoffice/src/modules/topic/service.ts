import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetTopicsResponse } from './models'
import { TopicRepository, TopicRepostoryPlugin } from './repository'

import { HashTagInTopic, Topic, TopicStatus } from '../../../__generated__/prisma'
import { HashTag } from '../../dtos/tag'
import { mapRawPrismaError } from '../../utils/prisma'

export class TopicService {
  constructor(private readonly topicRepository: TopicRepository) {}

  async getTopics() {
    const topics = await this.topicRepository.getTopics()

    if (topics.isErr()) {
      return mapRawPrismaError(topics.error)
    }

    return ok(this.mapTopicsToTopicsResponse(topics.value))
  }

  async getFollowedTopics(userId: string) {
    const userFollowTopics = await this.topicRepository.getUserFollowedTopics(userId)

    if (userFollowTopics.isErr()) {
      return mapRawPrismaError(userFollowTopics.error)
    }

    const topics = userFollowTopics.value.map(({ topic }) => topic)

    return ok(this.mapTopicsToTopicsResponse(topics))
  }

  private mapTopicsToTopicsResponse(
    topics: (Topic & {
      hashTagInTopics: (HashTagInTopic & {
        hashTag: HashTag
      })[]
    })[]
  ): GetTopicsResponse {
    return topics
      .map((topic) => ({
        id: topic.id,
        name: topic.name,
        description: topic.description,
        bannerImage: topic.bannerImage,
        status: topic.status,
        createdAt: topic.createdAt,
        updatedAt: topic.updatedAt,
        hashTags: topic.hashTagInTopics
          .map(({ hashTag }) => ({
            id: hashTag.id,
            name: hashTag.name,
            status: hashTag.status,
            createdAt: hashTag.createdAt,
            updatedAt: hashTag.updatedAt,
          }))
          .filter(({ status }) => status === TopicStatus.PUBLISH),
      }))
      .filter(({ status }) => status === TopicStatus.PUBLISH)
  }
}

export const TopicServicePlugin = new Elysia({ name: 'TopicService' })
  .use(TopicRepostoryPlugin)
  .decorate(({ topicRepository }) => ({
    topicService: new TopicService(topicRepository),
  }))
