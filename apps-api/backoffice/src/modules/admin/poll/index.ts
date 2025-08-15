import Elysia from 'elysia'

import {
  DeleteDraftedPollResponse,
  DeletePublishedPollResponse,
  DraftedPollPublishedResponse,
  GetDraftedPollResponse,
  GetPollsQuery,
  GetPollsResponse,
  GetPublishedPollResponse,
  PollIdParams,
  PostDraftedPollResponse,
  PublishedPollUnpublishedResponse,
  PutDraftedPollBody,
  PutDraftedPollResponse,
  PutPublishedPollBody,
  PutPublishedPollResponse,
} from './models'
import { AdminPollServicePlugin } from './services'

import { InternalErrorCode } from '../../../dtos/error'
import { AuthGuardPlugin } from '../../../plugins/auth-guard'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../../utils/error'

const AdminDraftedPollsController = new Elysia({
  prefix: '/draft',
  tags: ['Admin Drafted Polls'],
})
  .use([AuthGuardPlugin, AdminPollServicePlugin])
  .get(
    '/:pollId',
    async ({ params, status, adminPollService }) => {
      const result = await adminPollService.getDraftedPollById(params.pollId)
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
      requiredLocalUser: true,
      params: PollIdParams,
      response: {
        200: GetDraftedPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get drafted poll by ID',
        description: 'Fetch a specific drafted poll by its ID',
      },
    }
  )
  .post(
    '/',
    async ({ status, adminPollService }) => {
      const result = await adminPollService.createEmptyDraftedPoll()
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(201, result.value)
    },
    {
      requiredLocalUser: true,
      response: {
        201: PostDraftedPollResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Create empty drafted poll',
        description: 'Add empty poll to be updated later',
      },
    }
  )
  .put(
    '/:pollId',
    async ({ params, body, status, adminPollService }) => {
      const result = await adminPollService.updateDraftedPollById(params.pollId, body)
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
      requiredLocalUser: true,
      params: PollIdParams,
      body: PutDraftedPollBody,
      response: {
        200: PutDraftedPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update drafted poll by ID',
        description: 'Update a specific drafted poll by its ID',
      },
    }
  )
  .post(
    '/:pollId/publish',
    async ({ params, user, status, adminPollService }) => {
      const result = await adminPollService.publishDraftedPollById(params.pollId, user.id)
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
      requiredLocalUser: true,
      params: PollIdParams,
      response: {
        200: DraftedPollPublishedResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Publish drafted poll by ID',
        description: 'Publish a specific drafted poll by its ID',
      },
    }
  )
  .delete(
    '/:pollId',
    async ({ params, status, adminPollService }) => {
      const result = await adminPollService.deleteDraftedPoll(params.pollId)
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
      requiredLocalUser: true,
      params: PollIdParams,
      response: {
        200: DeleteDraftedPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete drafted poll by ID',
        description: 'Remove a specific drafted poll by its ID',
      },
    }
  )

export const AdminPollsController = new Elysia({
  prefix: '/polls',
  tags: ['Admin Polls'],
})
  .use([AuthGuardPlugin, AdminPollServicePlugin])
  .use(AdminDraftedPollsController)
  .get(
    '/',
    async ({ query, status, adminPollService }) => {
      const pagingQuery = {
        limit: query.limit ?? 10,
        page: query.page ?? 1,
      }

      if (query.type === 'publish') {
        const result = await adminPollService.getPublishedPolls(pagingQuery)
        if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

        return status(200, result.value)
      } else if (query.type === 'draft') {
        const result = await adminPollService.getDraftedPolls(pagingQuery)
        if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

        return status(200, result.value)
      }

      const result = await adminPollService.getPolls()
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
      requiredLocalUser: true,
      params: PollIdParams,
      response: {
        200: GetPublishedPollResponse,
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
  .post(
    '/:pollId/unpublish',
    async ({ params, status, adminPollService }) => {
      const result = await adminPollService.unpublishPollById(params.pollId)
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
      requiredLocalUser: true,
      params: PollIdParams,
      response: {
        200: PublishedPollUnpublishedResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Unpublish poll by ID',
        description: 'Unpublish a specific poll by its ID',
      },
    }
  )
  .delete(
    '/:pollId',
    async ({ params, status, adminPollService }) => {
      const result = await adminPollService.deletePollById(params.pollId)
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
