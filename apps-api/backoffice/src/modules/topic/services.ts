import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { HashTag } from '@pple-today/api-common/dtos'
import { FileService } from '@pple-today/api-common/services'
import { err, mapRepositoryError } from '@pple-today/api-common/utils'
import { HashTagInTopic, Topic, TopicStatus } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetTopicsResponse, ListTopicResponse } from './models'
import { TopicRepository, TopicRepositoryPlugin } from './repository'

import { FileServicePlugin } from '../../plugins/file'

export class TopicService {
  constructor(
    private readonly topicRepository: TopicRepository,
    private readonly fileService: FileService
  ) {}

  async getTopics() {
    const topics = await this.topicRepository.getTopics()

    if (topics.isErr()) {
      return mapRepositoryError(topics.error)
    }

    return ok(this.mapTopicsToTopicsResponse(topics.value))
  }

  async getTopicById(topicId: string) {
    const topic = await this.topicRepository.getTopicById(topicId)

    if (topic.isErr()) {
      return mapRepositoryError(topic.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.TOPIC_NOT_FOUND,
          message: `Topic not found`,
        },
      })
    }
    return ok(this.mapTopicToTopicResponse(topic.value))
  }

  async listTopic(userId: string) {
    const topics = await this.topicRepository.listTopicWithFollowedStatus(userId)
    if (topics.isErr()) {
      return mapRepositoryError(topics.error)
    }
    const response: ListTopicResponse = topics.value.map((topic) => ({
      id: topic.id,
      name: topic.name,
      followed: topic.followedTopics.length > 0,
    }))
    return ok(response)
  }

  async getFollowedTopics(userId: string) {
    const userFollowTopics = await this.topicRepository.getUserFollowedTopics(userId)

    if (userFollowTopics.isErr()) {
      return mapRepositoryError(userFollowTopics.error)
    }

    const topics = userFollowTopics.value.map(({ topic }) => topic)

    return ok(this.mapTopicsToTopicsResponse(topics))
  }

  async followTopic(topicId: string, userId: string) {
    const topic = await this.topicRepository.getTopicById(topicId)

    if (topic.isErr()) {
      return mapRepositoryError(topic.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.TOPIC_NOT_FOUND,
          message: `Topic not found`,
        },
      })
    }

    // cannot follow draft topic
    if (topic.value?.status == TopicStatus.DRAFT) {
      return err({
        code: InternalErrorCode.TOPIC_CANNOT_FOLLOW_DRAFT,
        message: `Cannot follow topic with status '${TopicStatus.DRAFT}'`,
      })
    }

    const userFollowTopic = await this.topicRepository.createUserFollowTopic(userId, topicId)

    if (userFollowTopic.isErr()) {
      return mapRepositoryError(userFollowTopic.error, {
        //  user already followed the topic
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.TOPIC_ALREADY_FOLLOWED,
          message: `User already followed the topic`,
        },
      })
    }

    return ok()
  }

  async unFollowTopic(topicId: string, userId: string) {
    const topic = await this.topicRepository.getTopicById(topicId)

    if (topic.isErr()) {
      return mapRepositoryError(topic.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.TOPIC_NOT_FOUND,
          message: `Topic not found`,
        },
      })
    }

    const result = await this.topicRepository.deleteUserFollowTopic(userId, topicId)

    if (result.isErr()) {
      return mapRepositoryError(result.error, {
        MODEL_NOT_CONNECT: {
          code: InternalErrorCode.TOPIC_NOT_FOLLOWED,
          message: `Topic is not followed`,
        },
      })
    }

    return ok()
  }

  private mapTopicToTopicResponse(
    topic: Topic & {
      hashTagInTopics: (HashTagInTopic & {
        hashTag: HashTag
      })[]
    }
  ) {
    return {
      id: topic.id,
      name: topic.name,
      description: topic.description,
      bannerImage: topic.bannerImagePath
        ? this.fileService.getPublicFileUrl(topic.bannerImagePath)
        : null,
      status: topic.status,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
      hashTags: topic.hashTagInTopics.map(({ hashTag }) => ({
        id: hashTag.id,
        name: hashTag.name,
        status: hashTag.status,
        createdAt: hashTag.createdAt,
        updatedAt: hashTag.updatedAt,
      })),
    }
  }

  private mapTopicsToTopicsResponse(
    topics: (Topic & {
      hashTagInTopics: (HashTagInTopic & {
        hashTag: HashTag
      })[]
    })[]
  ): GetTopicsResponse {
    return topics.map(this.mapTopicToTopicResponse)
  }
}

export const TopicServicePlugin = new Elysia({ name: 'TopicService' })
  .use([TopicRepositoryPlugin, FileServicePlugin])
  .decorate(({ topicRepository, fileService }) => ({
    topicService: new TopicService(topicRepository, fileService),
  }))
