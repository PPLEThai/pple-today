import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetHashtagResponse } from './models'
import { HashtagRepository, HashtagRepositoryPlugin } from './repository'

export class HashtagService {
  constructor(private readonly topicRepository: HashtagRepository) {}

  async getHashtagById(hashtagId: string) {
    const result = await this.topicRepository.getHashtagById(hashtagId)
    if (result.isErr()) {
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.HASHTAG_NOT_FOUND,
          message: `Hashtag not found`,
        },
      })
    }
    const obj: GetHashtagResponse = {
      id: result.value.id,
      name: result.value.name,
      createdAt: result.value.createdAt,
      topics: result.value.hashTagInTopics.map(({ topic }) => ({
        id: topic.id,
        name: topic.name,
      })),
    }
    return ok(obj)
  }
}

export const HashtagServicePlugin = new Elysia({ name: 'HashtagService' })
  .use(HashtagRepositoryPlugin)
  .decorate(({ hashtagRepository }) => ({
    hashtagService: new HashtagService(hashtagRepository),
  }))
