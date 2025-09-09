import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  CreateHashtagBody,
  CreateHashtagResponse,
  DeleteHashtagResponse,
  GetHashtagByIdResponse,
  GetHashtagsResponse,
  UpdateHashtagBody,
  UpdateHashtagResponse,
} from './models'
import { AdminHashtagRepository, AdminHashtagRepositoryPlugin } from './repository'

export class AdminHashtagService {
  constructor(private adminHashtagRepository: AdminHashtagRepository) {}

  async getHashtags(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const result = await this.adminHashtagRepository.getHashtags(query)
    if (result.isErr()) return mapRepositoryError(result.error)

    return ok(result.value satisfies GetHashtagsResponse)
  }

  async getHashtagById(hashtagId: string) {
    const result = await this.adminHashtagRepository.getHashtagById(hashtagId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.HASHTAG_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetHashtagByIdResponse)
  }

  async createHashtag(data: CreateHashtagBody) {
    const result = await this.adminHashtagRepository.createHashtag(data)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        INVALID_INPUT: {
          code: InternalErrorCode.HASHTAG_INVALID_INPUT,
        },
      })

    return ok({ hashtagId: result.value.id } satisfies CreateHashtagResponse)
  }

  async updateHashtagById(hashtagId: string, data: UpdateHashtagBody) {
    const result = await this.adminHashtagRepository.updateHashtagById(hashtagId, data)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.HASHTAG_NOT_FOUND,
        },
        INVALID_INPUT: {
          code: InternalErrorCode.HASHTAG_INVALID_INPUT,
        },
      })

    return ok({ message: `Hashtag "${result.value.id}" updated.` } satisfies UpdateHashtagResponse)
  }

  async deleteHashtagById(hashtagId: string) {
    const result = await this.adminHashtagRepository.deleteHashtagById(hashtagId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.HASHTAG_NOT_FOUND,
        },
      })

    return ok({ message: `Hashtag "${result.value.id}" deleted.` } satisfies DeleteHashtagResponse)
  }
}

export const AdminHashtagServicePlugin = new Elysia({
  name: 'AdminHashtagService',
})
  .use(AdminHashtagRepositoryPlugin)
  .decorate(({ adminHashtagRepository }) => ({
    adminHashtagService: new AdminHashtagService(adminHashtagRepository),
  }))
