import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetTopicsResponse } from './models'
import { TopicRepository, TopicRepostoryPlugin } from './repository'

import { TopicStatus } from '../../../__generated__/prisma'
import { mapRawPrismaError } from '../../utils/prisma'

export class TopicService {
  constructor(private readonly topicRepository: TopicRepository) {}

  async GetTopics() {
    const topics = await this.topicRepository.getTopics()

    if (topics.isErr()) {
      return mapRawPrismaError(topics.error)
    }

    const result: GetTopicsResponse = topics.value
      .map((topic) => ({
        id: topic.id,
        name: topic.name,
        description: topic.description,
        bannerImage: topic.bannerImage,
        status: topic.status,
        createdAt: topic.createdAt,
        updatedAt: topic.updatedAt,
        hashTags: topic.hashTagInTopics
          .map((hashTag) => ({
            id: hashTag.hashTag.id,
            name: hashTag.hashTag.name,
            status: hashTag.hashTag.status,
            createdAt: hashTag.hashTag.createdAt,
            updatedAt: hashTag.hashTag.updatedAt,
          }))
          .filter((hashTag) => hashTag.status === TopicStatus.PUBLISH),
      }))
      .filter((topic) => topic.status === TopicStatus.PUBLISH)

    return ok(result)
  }
}

export const TopicServicePlugin = new Elysia({ name: 'TopicService' })
  .use(TopicRepostoryPlugin)
  .decorate(({ topicRepository }) => ({
    topicService: new TopicService(topicRepository),
  }))
