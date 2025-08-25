import Elysia from 'elysia'

import {
  DeleteDraftPollResponse,
  DeletePublishedPollResponse,
  DraftPollPublishedResponse,
  GetDraftPollResponse,
  GetPollsQuery,
  GetPollsResponse,
  GetPublishedPollResponse,
  PollIdParams,
  PostDraftPollResponse,
  PublishedPollUnpublishedResponse,
  PutDraftPollBody,
  PutDraftPollResponse,
  PutPublishedPollBody,
  PutPublishedPollResponse,
} from './models'
import { AdminPollServicePlugin } from './services'

import { InternalErrorCode } from '../../../dtos/error'
import { AuthGuardPlugin } from '../../../plugins/auth-guard'
import { createErrorSchema, mapErrorCodeToResponse } from '../../../utils/error'

const AdminDraftPollsController = new Elysia({
  prefix: '/draft',
  tags: ['Admin Draft Polls'],
})
  .use([AuthGuardPlugin, AdminPollServicePlugin])
  .get(
    '/:pollId',
    async ({ params, status, adminPollService }) => {
      const result = await adminPollService.getDraftPollById(params.pollId)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: PollIdParams,
      response: {
        200: GetDraftPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get draft poll by ID',
        description: 'Fetch a specific draft poll by its ID',
      },
    }
  )
  .post(
    '/',
    async ({ status, adminPollService }) => {
      const result = await adminPollService.createEmptyDraftPoll()
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(201, result.value)
    },
    {
      requiredLocalUser: true,
      response: {
        201: PostDraftPollResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Create empty draft poll',
        description: 'Add empty poll to be updated later',
      },
    }
  )
  .put(
    '/:pollId',
    async ({ params, body, status, adminPollService }) => {
      const result = await adminPollService.updateDraftPollById(params.pollId, body)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: PollIdParams,
      body: PutDraftPollBody,
      response: {
        200: PutDraftPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update draft poll by ID',
        description: 'Update a specific draft poll by its ID',
      },
    }
  )
  .post(
    '/:pollId/publish',
    async ({ params, user, status, adminPollService }) => {
      const result = await adminPollService.publishDraftPollById(params.pollId, user.id)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: PollIdParams,
      response: {
        200: DraftPollPublishedResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Publish draft poll by ID',
        description: 'Publish a specific draft poll by its ID',
      },
    }
  )
  .delete(
    '/:pollId',
    async ({ params, status, adminPollService }) => {
      const result = await adminPollService.deleteDraftPoll(params.pollId)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: PollIdParams,
      response: {
        200: DeleteDraftPollResponse,
        ...createErrorSchema(
          InternalErrorCode.POLL_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete draft poll by ID',
        description: 'Remove a specific draft poll by its ID',
      },
    }
  )

export const AdminPollsController = new Elysia({
  prefix: '/polls',
  tags: ['Admin Polls'],
})
  .use([AuthGuardPlugin, AdminPollServicePlugin])
  .use(AdminDraftPollsController)
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
        const result = await adminPollService.getDraftPolls(pagingQuery)
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
        return mapErrorCodeToResponse(result.error, status)
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
  .post(
    '/:pollId/unpublish',
    async ({ params, status, adminPollService }) => {
      const result = await adminPollService.unpublishPollById(params.pollId)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
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
