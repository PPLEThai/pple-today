import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  DeletePollParams,
  DeletePollResponse,
  GetPollByIdParams,
  GetPollByIdResponse,
  GetPollsQuery,
  GetPollsResponse,
  PostPollBody,
  PostPollResponse,
  UpdatePollBody,
  UpdatePollParams,
  UpdatePollResponse,
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
      const result = await adminPollService.getPolls(
        query.page ?? 1,
        query.limit ?? 10,
        query.status,
        query.search
      )
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
        summary: 'Get list of polls',
        description: 'Fetch a list of polls',
      },
    }
  )
  .post(
    '/',
    async ({ body, status, adminPollService }) => {
      const result = await adminPollService.createPoll(body)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(201, result.value)
    },
    {
      requiredLocalUser: true,
      body: PostPollBody,
      response: {
        201: PostPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Create a new poll',
        description: 'Create a new poll with the provided details',
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
      params: GetPollByIdParams,
      response: {
        200: GetPollByIdResponse,
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
  .patch(
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
      params: UpdatePollParams,
      body: UpdatePollBody,
      response: {
        200: UpdatePollResponse,
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
      params: DeletePollParams,
      response: {
        200: DeletePollResponse,
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
