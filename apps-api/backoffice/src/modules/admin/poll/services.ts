import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { GetPollResponse, GetPollsResponse, PutPublishedPollBody } from './models'
import { AdminPollRepository, AdminPollRepositoryPlugin } from './repository'

export class AdminPollService {
  constructor(private adminPollRepository: AdminPollRepository) {}

  async getPolls(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const result = await this.adminPollRepository.getPolls(query)
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

    return ok(result.value satisfies GetPollResponse)
  }

  async updatePollById(pollId: string, data: PutPublishedPollBody) {
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
