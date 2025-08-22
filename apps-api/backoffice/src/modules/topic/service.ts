import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetTopicsResponse } from './models'
import { TopicRepository, TopicRepostoryPlugin } from './repository'

import { HashTagInTopic, Topic, TopicStatus } from '../../../__generated__/prisma'
import { HashTag } from '../../dtos/tag'
import { mapRawPrismaError } from '../../utils/prisma'
import { err } from '../../utils/error'
import { InternalErrorCode } from '../../dtos/error'

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

  async followTopic(topicId: string, userId: string) {
    const topic = await this.topicRepository.getTopicById(topicId)

    if (topic.isErr()) {
      return mapRawPrismaError(topic.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.TOPIC_NOT_FOUND,
          message: `topic not found`,
        },
      })
    }

    // cannot follow draft topic
    if (topic.value?.status == TopicStatus.DRAFT) {
      return err({
        code: InternalErrorCode.TOPIC_CANNOT_FOLLOW_DRAFT,
        message: `cannot follow topic with status '${TopicStatus.DRAFT}'`,
      })
    }

    const userFollowTopic = await this.topicRepository.createUserFollowTopic(userId, topicId)

    if (userFollowTopic.isErr()) {
      return mapRawPrismaError(userFollowTopic.error, {
        //  user already followed the topic
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.TOPIC_ALREADY_FOLLOWED,
          message: `user already followed the topic`,
        },
      })
    }

    return ok()
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
