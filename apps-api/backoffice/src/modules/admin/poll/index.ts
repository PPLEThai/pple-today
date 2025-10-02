import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  DeletePublishedPollResponse,
  GetPollResponse,
  GetPollsQuery,
  GetPollsResponse,
  PollIdParams,
  PutPublishedPollBody,
  PutPublishedPollResponse,
} from './models'
import { AdminPollServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminPollsController = new Elysia({
  prefix: '/polls',
  tags: ['Admin Polls'],
})
  .use([AdminAuthGuardPlugin, AdminPollServicePlugin])
  .get(
    '/',
    async ({ query, status, adminPollService }) => {
      const pagingQuery = {
        limit: query.limit ?? 10,
        page: query.page ?? 1,
      }

      const result = await adminPollService.getPolls(pagingQuery)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      query: GetPollsQuery,
      response: {
        200: GetPollsResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get polls by type',
        description: 'Fetch polls by type',
      },
    }
  )
  .get(
    '/:pollId',
    async ({ params, status, adminPollService }) => {
      const result = await adminPollService.getPollById(params.pollId)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: PollIdParams,
      response: {
        200: GetPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get poll by ID',
        description: 'Fetch a specific poll by its ID',
      },
    }
  )
  .put(
    '/:pollId',
    async ({ params, body, status, adminPollService }) => {
      const result = await adminPollService.updatePollById(params.pollId, body)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: PollIdParams,
      body: PutPublishedPollBody,
      response: {
        200: PutPublishedPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update poll by ID',
        description: 'Update a specific poll by its ID',
      },
    }
  )
  .delete(
    '/:pollId',
    async ({ params, status, adminPollService }) => {
      const result = await adminPollService.deletePollById(params.pollId)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: PollIdParams,
      response: {
        200: DeletePublishedPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete poll by ID',
        description: 'Remove a specific poll by its ID',
      },
    }
  )
