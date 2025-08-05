import node from '@elysiajs/node'
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
import { createErrorSchema, mapErrorCodeToResponse } from '../../utils/error'

export const PollsController = new Elysia({
  prefix: '/polls',
  adapter: node(),
})
  .use(AuthGuardPlugin)
  .use(PollsServicePlugin)
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
    }
  )
  .post(
    '/:id/vote/:optionId',
    async ({ params, user, pollsService, status }) => {
      const result = await pollsService.createPollVote(user.sub, params.id, params.optionId)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
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
          InternalErrorCode.POLL_ALREADY_VOTED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .delete(
    '/:id/vote/:optionId',
    async ({ params, user, status, pollsService }) => {
      const result = await pollsService.deletePollVote(user.sub, params.id, params.optionId)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
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
          InternalErrorCode.POLL_VOTE_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
