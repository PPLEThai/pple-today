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

    return ok(result)
  }
}

export const TopicServicePlugin = new Elysia({ name: 'TopicService' })
  .use(TopicRepostoryPlugin)
  .decorate(({ topicRepository }) => ({
    topicService: new TopicService(topicRepository),
  }))
