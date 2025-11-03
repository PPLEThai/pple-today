import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { PollStatus } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetPollByIdResponse, GetPollsResponse, PostPollBody, PutPollBody } from './models'
import { AdminPollRepository, AdminPollRepositoryPlugin } from './repository'

export class AdminPollService {
  constructor(private adminPollRepository: AdminPollRepository) {}

  async getPolls(page: number, limit: number, status?: PollStatus[], search?: string) {
    const result = await this.adminPollRepository.getPolls(page, limit, status, search)
    if (result.isErr()) return mapRepositoryError(result.error, {})

    return ok(result.value satisfies GetPollsResponse)
  }

  async getPollById(pollId: string) {
    const result = await this.adminPollRepository.getPollById(pollId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetPollByIdResponse)
  }

  async createPoll(data: PostPollBody) {
    const result = await this.adminPollRepository.createPoll(data)
    if (result.isErr()) return mapRepositoryError(result.error)

    return ok({ id: result.value.id })
  }

  async updatePollById(pollId: string, data: PutPollBody) {
    const result = await this.adminPollRepository.updatePollById(pollId, data)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Poll "${result.value.feedItemId}" updated.` })
  }

  async deletePollById(pollId: string) {
    const result = await this.adminPollRepository.deletePollById(pollId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Poll "${result.value.id}" deleted.` })
  }
}

export const AdminPollServicePlugin = new Elysia({ name: 'AdminPollService' })
  .use(AdminPollRepositoryPlugin)
  .decorate(({ adminPollRepository }) => ({
    adminPollService: new AdminPollService(adminPollRepository),
  }))
