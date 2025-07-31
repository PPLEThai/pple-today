import node from '@elysiajs/node'
import Elysia from 'elysia'

import {
  DeleteDraftedPollResponse,
  DeletePublishedPollResponse,
  GetDraftedPollResponse,
  GetPollsQuery,
  GetPollsResponse,
  GetPublishedPollResponse,
  PollIdParam,
  PostDraftedPollResponse,
  PutDraftedPollResponse,
  PutPollBody,
  PutPublishedPollResponse,
} from './models'
import { PollServicePlugin } from './services'

import { InternalErrorCode } from '../../../dtos/error'
import { AuthGuardPlugin } from '../../../plugins/auth-guard'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../../utils/error'

const DraftedPollsController = new Elysia({
  prefix: '/draft',
  adapter: node(),
  tags: ['Drafted Polls'],
})
  .use([AuthGuardPlugin, PollServicePlugin])
  .get(
    '/:pollId',
    async ({ params, status, pollService }) => {
      const result = await pollService.getDraftedPollById(params.pollId)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.POLL_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, result.value)
    },
    {
      requiredUser: true,
      params: PollIdParam,
      response: {
        200: GetDraftedPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: 'Get drafted poll by ID',
        description: 'Fetch a specific drafted poll by its ID',
      },
    }
  )
  .post(
    '/',
    async ({ status, pollService }) => {
      const result = await pollService.createEmptyDraftedPoll()
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(201, result.value)
    },
    {
      requiredUser: true,
      response: {
        201: PostDraftedPollResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: 'Create empty drafted poll',
        description: 'Add empty poll to be updated later',
      },
    }
  )
  .put(
    '/:pollId',
    async ({ params, body, status, pollService }) => {
      const result = await pollService.updateDraftedPollById(params.pollId, body)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.POLL_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, result.value)
    },
    {
      requiredUser: true,
      params: PollIdParam,
      body: PutPollBody,
      response: {
        200: PutDraftedPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: 'Update drafted poll by ID',
        description: 'Update a specific drafted poll by its ID',
      },
    }
  )
  .delete(
    '/:pollId',
    async ({ params, status, pollService }) => {
      const result = await pollService.deleteDraftedPoll(params.pollId)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.POLL_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, result.value)
    },
    {
      requiredUser: true,
      params: PollIdParam,
      response: {
        200: DeleteDraftedPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: 'Delete drafted poll by ID',
        description: 'Remove a specific drafted poll by its ID',
      },
    }
  )

export const PollsController = new Elysia({
  prefix: '/polls',
  adapter: node(),
  tags: ['Polls'],
})
  .use([AuthGuardPlugin, PollServicePlugin, DraftedPollsController])
  .get(
    '/',
    async ({ query, status, pollService }) => {
      if (query.type === 'publish') {
        const result = await pollService.getPublishedPolls()
        if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

        return status(200, result.value)
      } else if (query.type === 'draft') {
        const result = await pollService.getDraftedPolls()
        if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

        return status(200, result.value)
      }

      const result = await pollService.getPolls()
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredUser: true,
      query: GetPollsQuery,
      response: {
        200: GetPollsResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: 'Get polls by type',
        description: 'Fetch polls by type',
      },
    }
  )
  .get(
    '/:pollId',
    async ({ params, status, pollService }) => {
      const result = await pollService.getPollById(params.pollId)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.POLL_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, result.value)
    },
    {
      requiredUser: true,
      params: PollIdParam,
      response: {
        200: GetPublishedPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: 'Get poll by ID',
        description: 'Fetch a specific poll by its ID',
      },
    }
  )
  .put(
    '/:pollId',
    async ({ params, body, status, pollService }) => {
      const result = await pollService.updatePollById(params.pollId, body)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.POLL_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, result.value)
    },
    {
      requiredUser: true,
      params: PollIdParam,
      body: PutPollBody,
      response: {
        200: PutPublishedPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: 'Update poll by ID',
        description: 'Update a specific poll by its ID',
      },
    }
  )
  .delete(
    '/:pollId',
    async ({ params, status, pollService }) => {
      const result = await pollService.deletePollById(params.pollId)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.POLL_NOT_FOUND:
            return mapErrorCodeToResponse(result.error, status)
          case InternalErrorCode.INTERNAL_SERVER_ERROR:
            return mapErrorCodeToResponse(result.error, status)
          default:
            exhaustiveGuard(result.error)
        }
      }

      return status(200, result.value)
    },
    {
      requiredUser: true,
      params: PollIdParam,
      response: {
        200: DeletePublishedPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        security: [
          {
            bearerAuth: [],
          },
        ],
        summary: 'Delete poll by ID',
        description: 'Remove a specific poll by its ID',
      },
    }
  )
