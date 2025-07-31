import node from '@elysiajs/node'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  GetDraftedPollResponse,
  GetDraftedPollsResponse,
  GetPollsResponse,
  GetPublishedPollResponse,
  GetPublishedPollsResponse,
  PutPollBody,
} from './models'
import { PollRepository, PollRepositoryPlugin } from './repository'

import { InternalErrorCode } from '../../../dtos/error'
import { mapRawPrismaError } from '../../../utils/prisma'

export class PollService {
  constructor(private pollRepository: PollRepository) {}

  async getPolls() {
    const result = await this.pollRepository.getAllPolls()
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok(result.value satisfies GetPollsResponse)
  }

  async getPublishedPolls() {
    const result = await this.pollRepository.getPolls()
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok(result.value satisfies GetPublishedPollsResponse)
  }

  async getPollById(pollId: string) {
    const result = await this.pollRepository.getPollById(pollId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetPublishedPollResponse)
  }

  async updatePollById(pollId: string, data: PutPollBody) {
    const result = await this.pollRepository.updatePollById(pollId, data)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Poll "${result.value.feedItemId}" updated.` })
  }

  async deletePollById(pollId: string) {
    const result = await this.pollRepository.deletePollById(pollId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Poll "${result.value.id}" deleted.` })
  }

  async getDraftedPolls() {
    const result = await this.pollRepository.getDraftedPolls()
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok(result.value satisfies GetDraftedPollsResponse)
  }

  async getDraftedPollById(pollId: string) {
    const result = await this.pollRepository.getDraftedPollById(pollId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok(result.value satisfies GetDraftedPollResponse)
  }

  async createEmptyDraftedPoll() {
    const result = await this.pollRepository.createEmptyDraftedPoll()
    if (result.isErr()) return mapRawPrismaError(result.error, {})

    return ok({ message: `Drafted Poll "${result.value.id}" created.` })
  }

  async updateDraftedPollById(pollId: string, data: PutPollBody) {
    const result = await this.pollRepository.updateDraftedPollById(pollId, data)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Drafted Poll "${result.value.id}" updated.` })
  }

  async deleteDraftedPoll(pollId: string) {
    const result = await this.pollRepository.deleteDraftedPollById(pollId)
    if (result.isErr())
      return mapRawPrismaError(result.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.POLL_NOT_FOUND,
        },
      })

    return ok({ message: `Drafted Poll "${result.value.id}" deleted.` })
  }
}

export const PollServicePlugin = new Elysia({ name: 'PollService', adapter: node() })
  .use(PollRepositoryPlugin)
  .decorate(({ pollRepository }) => ({
    pollService: new PollService(pollRepository),
  }))
