import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  GetDraftPollResponse,
  GetDraftPollsResponse,
  GetPollsResponse,
  GetPublishedPollResponse,
  GetPublishedPollsResponse,
  PutDraftPollBody,
  PutPublishedPollBody,
} from './models'
import { AdminPollRepository, AdminPollRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../../dtos/error'
import { mapRepositoryError } from '../../../utils/error'

export class AdminPollService {
  constructor(private adminPollRepository: AdminPollRepository) {}

  async getPolls() {
    const result = await this.adminPollRepository.getAllPolls()
    if (result.isErr()) return mapRepositoryError(result.error, {})

    return ok(result.value satisfies GetPollsResponse)
  }

  async getPublishedPolls(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const result = await this.adminPollRepository.getPolls(query)
    if (result.isErr()) return mapRepositoryError(result.error, {})

    return ok(result.value satisfies GetPublishedPollsResponse)
  }

  async getPollById(pollId: string) {
    const result = await this.adminPollRepository.getPollById(pollId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetPublishedPollResponse)
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

  async unpublishPollById(pollId: string) {
    const result = await this.adminPollRepository.unpublishPollById(pollId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Poll "${result.value.id}" unpublished.` })
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

  async getDraftPolls(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const result = await this.adminPollRepository.getDraftPolls(query)
    if (result.isErr()) return mapRepositoryError(result.error, {})

    return ok(result.value satisfies GetDraftPollsResponse)
  }

  async getDraftPollById(pollId: string) {
    const result = await this.adminPollRepository.getDraftPollById(pollId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetDraftPollResponse)
  }

  async createEmptyDraftPoll() {
    const result = await this.adminPollRepository.createEmptyDraftPoll()
    if (result.isErr()) return mapRepositoryError(result.error, {})

    return ok({ pollId: result.value.id })
  }

  async updateDraftPollById(pollId: string, data: PutDraftPollBody) {
    const result = await this.adminPollRepository.updateDraftPollById(pollId, data)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Draft Poll "${result.value.id}" updated.` })
  }

  async publishDraftPollById(pollId: string, authorId: string) {
    const result = await this.adminPollRepository.publishDraftPollById(pollId, authorId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Draft Poll "${result.value.id}" published.` })
  }

  async deleteDraftPoll(pollId: string) {
    const result = await this.adminPollRepository.deleteDraftPollById(pollId)
    if (result.isErr())
      return mapRepositoryError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Draft Poll "${result.value.id}" deleted.` })
  }
}

export const AdminPollServicePlugin = new Elysia({ name: 'AdminPollService' })
  .use(AdminPollRepositoryPlugin)
  .decorate(({ adminPollRepository }) => ({
    adminPollService: new AdminPollService(adminPollRepository),
  }))
