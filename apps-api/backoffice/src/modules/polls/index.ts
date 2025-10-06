import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  CreatePollVoteParams,
  CreatePollVoteResponse,
  DeletePollVoteParams,
  DeletePollVoteResponse,
  ListPollsQuery,
  ListPollsResponse,
} from './models'
import { PollsServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'

export const PollsController = new Elysia({
  prefix: '/polls',
  tags: ['Polls'],
})
  .use([AuthGuardPlugin, PollsServicePlugin])
  .get(
    '/',
    async ({ user, query, status, pollsService }) => {
      const result = await pollsService.getPolls(user?.id, {
        limit: query.limit,
        page: query.page,
      })

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      fetchLocalUser: true,
      query: ListPollsQuery,
      response: {
        200: ListPollsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'List polls',
        description: 'Fetch a list of polls with pagination',
      },
    }
  )
  .post(
    '/:id/vote/:optionId',
    async ({ params, user, pollsService, status }) => {
      const result = await pollsService.createPollVote(user.id, params.id, params.optionId)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(201, { message: 'Vote created successfully' })
    },
    {
      requiredLocalUserPrecondition: {
        isActive: true,
      },
      params: CreatePollVoteParams,
      response: {
        201: CreatePollVoteResponse,
        ...createErrorSchema(
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.POLL_OPTION_NOT_FOUND,
          InternalErrorCode.POLL_ALREADY_ENDED,
          InternalErrorCode.POLL_ALREADY_VOTED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Create poll vote',
        description: 'Cast a vote for a specific option in a poll',
      },
    }
  )
  .delete(
    '/:id/vote/:optionId',
    async ({ params, user, status, pollsService }) => {
      const result = await pollsService.deletePollVote(user.id, params.id, params.optionId)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, { message: 'Vote deleted successfully' })
    },
    {
      requiredLocalUserPrecondition: {
        isActive: true,
      },
      params: DeletePollVoteParams,
      response: {
        200: DeletePollVoteResponse,
        ...createErrorSchema(
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.POLL_VOTE_NOT_FOUND,
          InternalErrorCode.POLL_ALREADY_ENDED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete poll vote',
        description: 'Remove a vote for a specific option in a poll',
      },
    }
  )
