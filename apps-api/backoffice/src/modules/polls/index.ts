import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  ListPollsQuery,
  ListPollsResponse,
  UpsertPollVoteBody,
  UpsertPollVoteParams,
  UpsertPollVoteResponse,
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
  .put(
    '/:id/vote',
    async ({ params, body, user, pollsService, status }) => {
      const result = await pollsService.upsertPollVote(user.id, params.id, body.options)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(201, { message: 'Vote upserted successfully' })
    },
    {
      requiredLocalUserPrecondition: {
        isActive: true,
      },
      params: UpsertPollVoteParams,
      body: UpsertPollVoteBody,
      response: {
        201: UpsertPollVoteResponse,
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
        summary: 'Upsert poll vote',
        description: 'Cast a vote for a specific option in a poll',
      },
    }
  )
