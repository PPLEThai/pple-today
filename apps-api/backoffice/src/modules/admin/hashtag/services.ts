import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  DeleteHashtagResponse,
  GetHashtagByIdResponse,
  GetHashtagsResponse,
  CreateHashtagResponse,
  CreateHashtagBody,
  UpdateHashtagResponse,
} from './models'
import { AdminHashtagRepository, AdminHashtagRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../../dtos/error'
import { mapRawPrismaError } from '../../../utils/prisma'

export class AdminHashtagService {
  constructor(private adminHashtagRepository: AdminHashtagRepository) {}

  async getHashtags(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const result = await this.adminHashtagRepository.getHashtags(query)
    if (result.isErr()) return mapRawPrismaError(result.error)

    return ok(result.value satisfies GetHashtagsResponse)
  }

  async getHashtagById(hashtagId: string) {
    const result = await this.adminHashtagRepository.getHashtagById(hashtagId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.HASHTAG_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetHashtagResponse)
  }

  async createHashtag(data: PutHashtagBody) {
    const result = await this.adminHashtagRepository.createHashtag(data)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        INVALID_INPUT: {
          code: InternalErrorCode.HASHTAG_INVALID_INPUT,
        },
      })

    return ok({ hashtagId: result.value.id } satisfies PostHashtagResponse)
  }

  async updateHashtagById(hashtagId: string, data: PutHashtagBody) {
    const result = await this.adminHashtagRepository.updateHashtagById(hashtagId, data)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.HASHTAG_NOT_FOUND,
        },
        INVALID_INPUT: {
          code: InternalErrorCode.HASHTAG_INVALID_INPUT,
        },
      })

    return ok({ message: `Hashtag "${result.value.id}" updated.` } satisfies PutHashtagResponse)
  }

  async deleteHashtagById(hashtagId: string) {
    const result = await this.adminHashtagRepository.deleteHashtagById(hashtagId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
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
