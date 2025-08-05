import node from '@elysiajs/node'
import Elysia from 'elysia'
import { err, ok } from 'neverthrow'

import {
  GetDraftedPollResponse,
  GetDraftedPollsResponse,
  GetPollsResponse,
  GetPublishedPollResponse,
  GetPublishedPollsResponse,
  PutDraftedPollBody,
  PutPublishedPollBody,
} from './models'
import { AdminPollRepository, AdminPollRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../../dtos/error'
import { mapRawPrismaError } from '../../../utils/prisma'

export class AdminPollService {
  constructor(private adminPollRepository: AdminPollRepository) {}

  async getPolls() {
    const result = await this.adminPollRepository.getAllPolls()
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok(result.value satisfies GetPollsResponse)
  }

  async getPublishedPolls(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const result = await this.adminPollRepository.getPolls(query)
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok(result.value satisfies GetPublishedPollsResponse)
  }

  async getPollById(pollId: string) {
    const result = await this.adminPollRepository.getPollById(pollId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetPublishedPollResponse)
  }

  async updatePollById(pollId: string, data: PutPublishedPollBody) {
    const result = await this.adminPollRepository.updatePollById(pollId, data)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Poll "${result.value.feedItemId}" updated.` })
  }

  async unpublishPollById(pollId: string) {
    const result = await this.adminPollRepository.unpublishPollById(pollId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Poll "${result.value.id}" unpublished.` })
  }

  async deletePollById(pollId: string) {
    const result = await this.adminPollRepository.deletePollById(pollId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Poll "${result.value.id}" deleted.` })
  }

  async getDraftedPolls(
    query: { limit: number; page: number } = {
      limit: 10,
      page: 1,
    }
  ) {
    const result = await this.adminPollRepository.getDraftedPolls(query)
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok(result.value satisfies GetDraftedPollsResponse)
  }

  async getDraftedPollById(pollId: string) {
    const result = await this.adminPollRepository.getDraftedPollById(pollId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetDraftedPollResponse)
  }

  async createEmptyDraftedPoll() {
    const result = await this.adminPollRepository.createEmptyDraftedPoll()
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok({ pollId: result.value.id })
  }

  async updateDraftedPollById(pollId: string, data: PutDraftedPollBody) {
    const result = await this.adminPollRepository.updateDraftedPollById(pollId, data)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Drafted Poll "${result.value.id}" updated.` })
  }

  async publishDraftedPollById(pollId: string, authorId?: string) {
    if (!authorId)
      // FIXME: Proper message
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: InternalErrorCode.INTERNAL_SERVER_ERROR ?? 'An unexpected error occurred',
      })

    const result = await this.adminPollRepository.publishDraftedPollById(pollId, authorId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Drafted Poll "${result.value.id}" published.` })
  }

  async deleteDraftedPoll(pollId: string) {
    const result = await this.adminPollRepository.deleteDraftedPollById(pollId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Drafted Poll "${result.value.id}" deleted.` })
  }
}

export const AdminPollServicePlugin = new Elysia({ name: 'AdminPollService', adapter: node() })
  .use(AdminPollRepositoryPlugin)
  .decorate(({ adminPollRepository }) => ({
    adminPollService: new AdminPollService(adminPollRepository),
  }))
