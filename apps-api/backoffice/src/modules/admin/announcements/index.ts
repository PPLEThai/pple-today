import node from '@elysiajs/node'
import Elysia from 'elysia'

import {
  AnnouncementIdParams,
  DeleteDraftedAnnouncementResponse,
  DeletePublishedAnnouncementResponse,
  DraftedAnnouncementPublishedResponse,
  GetAnnouncementsQuery,
  GetAnnouncementsResponse,
  GetDraftedAnnouncementResponse,
  GetPublishedAnnouncementResponse,
  PostDraftedAnnouncementResponse,
  PublishedAnnouncementUnpublishedResponse,
  PutDraftedAnnouncementBody,
  PutDraftedAnnouncementResponse,
  PutPublishedAnnouncementBody,
  PutPublishedAnnouncementResponse,
} from './models'
import { AdminAnnouncementServicePlugin } from './service'

import { InternalErrorCode } from '../../../dtos/error'
import { AuthGuardPlugin } from '../../../plugins/auth-guard'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../../utils/error'

const AdminDraftedAnnouncementsController = new Elysia({
  prefix: '/draft',
  adapter: node(),
  tags: ['Drafted Announcements'],
})
  .use([AuthGuardPlugin, AdminAnnouncementServicePlugin])
  .get(
    '/:announcementId',
    async ({ params, status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.getDraftedAnnouncementById(
        params.announcementId
      )
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.ANNOUNCEMENT_NOT_FOUND:
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
      params: AnnouncementIdParams,
      response: {
        200: GetDraftedAnnouncementResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get drafted announcement by ID',
        description: 'Fetch a specific drafted announcement by its ID',
      },
    }
  )
  .post(
    '/',
    async ({ status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.createEmptyDraftedAnnouncement()
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(201, result.value)
    },
    {
      requiredUser: true,
      response: {
        201: PostDraftedAnnouncementResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Create empty drafted announcement',
        description: 'Add empty announcement to be updated later',
      },
    }
  )
  .put(
    '/:announcementId',
    async ({ params, body, status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.updateDraftedAnnouncementById(
        params.announcementId,
        body
      )
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.ANNOUNCEMENT_NOT_FOUND:
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
      params: AnnouncementIdParams,
      body: PutDraftedAnnouncementBody,
      response: {
        200: PutDraftedAnnouncementResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update drafted announcement by ID',
        description: 'Update a specific drafted announcement by its ID',
      },
    }
  )
  .post(
    '/:announcementId/publish',
    async ({ params, user, status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.publishDraftedAnnouncementById(
        params.announcementId,
        user.sub
      )
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.ANNOUNCEMENT_NOT_FOUND:
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
      params: AnnouncementIdParams,
      response: {
        200: DraftedAnnouncementPublishedResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Publish drafted announcement by ID',
        description: 'Publish a specific drafted announcement by its ID',
      },
    }
  )
  .delete(
    '/:announcementId',
    async ({ params, status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.deleteDraftedAnnouncement(params.announcementId)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.ANNOUNCEMENT_NOT_FOUND:
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
      params: AnnouncementIdParams,
      response: {
        200: DeleteDraftedAnnouncementResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete drafted announcement by ID',
        description: 'Remove a specific drafted announcement by its ID',
      },
    }
  )

export const AdminAnnouncementsController = new Elysia({
  prefix: '/announcements',
  adapter: node(),
  tags: ['Announcements'],
})
  .use([AuthGuardPlugin, AdminAnnouncementServicePlugin])
  .use(AdminDraftedAnnouncementsController)
  .get(
    '/',
    async ({ query, status, adminAnnouncementService }) => {
      const pagingQuery = {
        limit: query.limit ?? 10,
        page: query.page ?? 1,
      }

      if (query.type === 'publish') {
        const result = await adminAnnouncementService.getPublishedAnnouncements(pagingQuery)
        if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

        return status(200, result.value)
      } else if (query.type === 'draft') {
        const result = await adminAnnouncementService.getDraftedAnnouncements(pagingQuery)
        if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

        return status(200, result.value)
      }

      const result = await adminAnnouncementService.getAnnouncements()
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredUser: true,
      query: GetAnnouncementsQuery,
      response: {
        200: GetAnnouncementsResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get announcements by type',
        description: 'Fetch announcements by type',
      },
    }
  )
  .get(
    '/:announcementId',
    async ({ params, status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.getAnnouncementById(params.announcementId)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.ANNOUNCEMENT_NOT_FOUND:
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
      params: AnnouncementIdParams,
      response: {
        200: GetPublishedAnnouncementResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get announcement by ID',
        description: 'Fetch a specific announcement by its ID',
      },
    }
  )
  .put(
    '/:announcementId',
    async ({ params, body, status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.updateAnnouncementById(
        params.announcementId,
        body
      )
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.ANNOUNCEMENT_NOT_FOUND:
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
      params: AnnouncementIdParams,
      body: PutPublishedAnnouncementBody,
      response: {
        200: PutPublishedAnnouncementResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update announcement by ID',
        description: 'Update a specific announcement by its ID',
      },
    }
  )
  .post(
    '/:announcementId/unpublish',
    async ({ params, status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.unpublishAnnouncementById(params.announcementId)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.ANNOUNCEMENT_NOT_FOUND:
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
      params: AnnouncementIdParams,
      response: {
        200: PublishedAnnouncementUnpublishedResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Unpublish announcement by ID',
        description: 'Unpublish a specific announcement by its ID',
      },
    }
  )
  .delete(
    '/:announcementId',
    async ({ params, status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.deleteAnnouncementById(params.announcementId)
      if (result.isErr()) {
        switch (result.error.code) {
          case InternalErrorCode.ANNOUNCEMENT_NOT_FOUND:
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
      params: AnnouncementIdParams,
      response: {
        200: DeletePublishedAnnouncementResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete announcement by ID',
        description: 'Remove a specific announcement by its ID',
      },
    }
  )
