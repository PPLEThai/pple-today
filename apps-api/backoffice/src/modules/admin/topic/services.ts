import node from '@elysiajs/node'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  DeleteTopicResponse,
  GetTopicResponse,
  GetTopicsResponse,
  PostTopicResponse,
  PutTopicBody,
  PutTopicResponse,
} from './models'
import { AdminTopicRepository, AdminTopicRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../../dtos/error'
import { mapRawPrismaError } from '../../../utils/prisma'

export class AdminTopicService {
  constructor(private adminTopicRepository: AdminTopicRepository) {}

  async getTopics(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const result = await this.adminTopicRepository.getTopics(query)
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok(result.value satisfies GetTopicsResponse)
  }

  async getTopicById(topicId: string) {
    const result = await this.adminTopicRepository.getTopicById(topicId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.TOPIC_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetTopicResponse)
  }

  async createTopic(data: PutTopicBody) {
    const result = await this.adminTopicRepository.createTopic(data)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        INVALID_INPUT: {
          code: InternalErrorCode.TOPIC_INVALID_INPUT,
        },
      })

    return ok({ topicId: result.value.id } satisfies PostTopicResponse)
  }

  async updateTopicById(topicId: string, data: PutTopicBody) {
    const result = await this.adminTopicRepository.updateTopicById(topicId, data)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.TOPIC_NOT_FOUND,
        },
        INVALID_INPUT: {
          code: InternalErrorCode.TOPIC_INVALID_INPUT,
        },
      })

    return ok({ message: `Topic "${result.value.id}" updated.` } satisfies PutTopicResponse)
  }

  async deleteTopicById(topicId: string) {
    const result = await this.adminTopicRepository.deleteTopicById(topicId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.TOPIC_NOT_FOUND,
        },
      })

    return ok({ message: `Topic "${result.value.id}" deleted.` } satisfies DeleteTopicResponse)
  }
}

export const AdminTopicServicePlugin = new Elysia({
  name: 'AdminTopicService',
  adapter: node(),
})
  .use(AdminTopicRepositoryPlugin)
  .decorate(({ adminTopicRepository }) => ({
    adminTopicService: new AdminTopicService(adminTopicRepository),
  }))
