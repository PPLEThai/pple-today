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

import { InternalErrorCode } from '../../dtos/error'
import { AuthGuardPlugin } from '../../plugins/auth-guard'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../utils/error'

export const PollsController = new Elysia({
  prefix: '/polls',
  tags: ['Application Polls'],
})
  .use([AuthGuardPlugin, PollsServicePlugin])
  .get(
    '/',
    async ({ user, query, status, pollsService }) => {
      const result = await pollsService.getPolls(user?.sub, {
        limit: query.limit,
        page: query.page,
      })

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      fetchUser: true,
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
      const result = await pollsService.createPollVote(user.sub, params.id, params.optionId)

      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.POLL_ALREADY_VOTED:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.POLL_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.POLL_OPTION_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.POLL_ALREADY_ENDED:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(201, { message: 'Vote created successfully' })
    },
    {
      requiredUser: true,
      params: CreatePollVoteParams,
      response: {
        201: CreatePollVoteResponse,
        ...createErrorSchema(
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
      const result = await pollsService.deletePollVote(user.sub, params.id, params.optionId)

      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.POLL_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.POLL_ALREADY_ENDED:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, { message: 'Vote deleted successfully' })
    },
    {
      requiredUser: true,
      params: DeletePollVoteParams,
      response: {
        200: DeletePollVoteResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
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
