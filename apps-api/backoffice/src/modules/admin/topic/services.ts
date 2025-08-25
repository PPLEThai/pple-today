import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  CreateTopicResponse,
  DeleteTopicResponse,
  GetTopicByIdResponse,
  GetTopicsResponse,
  UpdateTopicBody,
  UpdateTopicResponse,
} from './models'
import { AdminTopicRepository, AdminTopicRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../../dtos/error'
import { FilePath } from '../../../dtos/file'
import { err } from '../../../utils/error'
import { mapRepositoryError } from '../../../utils/error'
import { FileService, FileServicePlugin } from '../../file/services'

export class AdminTopicService {
  constructor(
    private readonly adminTopicRepository: AdminTopicRepository,
    private readonly fileService: FileService
  ) {}

  async getTopics(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const result = await this.adminTopicRepository.getTopics(query)
    if (result.isErr()) return mapRepositoryError(result.error, {})

    return ok(result.value satisfies GetTopicsResponse)
  }

  async getTopicById(topicId: string) {
    const result = await this.adminTopicRepository.getTopicById(topicId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.TOPIC_NOT_FOUND,
        },
      })

    let bannerImageRes: {
      url: string
      filePath: FilePath
    } | null = null

    if (result.value.bannerImage) {
      const getSignedUrlResult = await this.fileService.getFileSignedUrl(result.value.bannerImage)
      if (getSignedUrlResult.isErr()) return err(getSignedUrlResult.error)

      bannerImageRes = {
        url: getSignedUrlResult.value,
        filePath: result.value.bannerImage as FilePath,
      }
    }

    return ok({
      ...result.value,
      bannerImage: bannerImageRes,
    } satisfies GetTopicByIdResponse)
  }

  async createEmptyTopic() {
    const result = await this.adminTopicRepository.createEmptyTopic()
    if (result.isErr())
      return mapRepositoryError(result.error, {
        INVALID_INPUT: {
          code: InternalErrorCode.TOPIC_INVALID_INPUT,
        },
      })

    return ok({ topicId: result.value.id } satisfies CreateTopicResponse)
  }

  async updateTopicById(topicId: string, data: UpdateTopicBody) {
    const result = await this.adminTopicRepository.updateTopicById(topicId, data)

    if (result.isErr())
      return mapRepositoryError(result.error, {
        INVALID_INPUT: {
          code: InternalErrorCode.TOPIC_INVALID_INPUT,
        },
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.TOPIC_NOT_FOUND,
        },
      })

    return ok({ message: `Topic "${result.value.id}" updated.` } satisfies UpdateTopicResponse)
  }

  async deleteTopicById(topicId: string) {
    const result = await this.adminTopicRepository.deleteTopicById(topicId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.TOPIC_NOT_FOUND,
        },
      })

    return ok({ message: `Topic "${result.value.id}" deleted.` } satisfies DeleteTopicResponse)
  }
}

export const AdminTopicServicePlugin = new Elysia({
  name: 'AdminTopicService',
})
  .use([AdminTopicRepositoryPlugin, FileServicePlugin])
  .decorate(({ adminTopicRepository, fileService }) => ({
    adminTopicService: new AdminTopicService(adminTopicRepository, fileService),
  }))
