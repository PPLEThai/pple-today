import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  AnnouncementIdParams,
  DeleteDraftAnnouncementResponse,
  DeletePublishedAnnouncementResponse,
  DraftAnnouncementPublishedResponse,
  GetAnnouncementsQuery,
  GetAnnouncementsResponse,
  GetDraftAnnouncementResponse,
  GetPublishedAnnouncementResponse,
  PostDraftAnnouncementResponse,
  PublishedAnnouncementUnpublishedResponse,
  PutDraftAnnouncementBody,
  PutDraftAnnouncementResponse,
  PutPublishedAnnouncementBody,
  PutPublishedAnnouncementResponse,
} from './models'
import { AdminAnnouncementServicePlugin } from './services'

import { AuthGuardPlugin } from '../../../plugins/auth-guard'

const AdminDraftAnnouncementsController = new Elysia({
  prefix: '/draft',
  tags: ['Admin Draft Announcements'],
})
  .use([AuthGuardPlugin, AdminAnnouncementServicePlugin])
  .get(
    '/:announcementId',
    async ({ params, status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.getDraftAnnouncementById(params.announcementId)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: AnnouncementIdParams,
      response: {
        200: GetDraftAnnouncementResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get draft announcement by ID',
        description: 'Fetch a specific draft announcement by its ID',
      },
    }
  )
  .post(
    '/',
    async ({ status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.createEmptyDraftAnnouncement()
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(201, result.value)
    },
    {
      requiredLocalUser: true,
      response: {
        201: PostDraftAnnouncementResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Create empty draft announcement',
        description: 'Add empty announcement to be updated later',
      },
    }
  )
  .put(
    '/:announcementId',
    async ({ params, body, status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.updateDraftAnnouncementById(
        params.announcementId,
        body
      )
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: AnnouncementIdParams,
      body: PutDraftAnnouncementBody,
      response: {
        200: PutDraftAnnouncementResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update draft announcement by ID',
        description: 'Update a specific draft announcement by its ID',
      },
    }
  )
  .post(
    '/:announcementId/publish',
    async ({ params, user, status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.publishDraftAnnouncementById(
        params.announcementId,
        user.id
      )
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: AnnouncementIdParams,
      response: {
        200: DraftAnnouncementPublishedResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.ANNOUNCEMENT_INVALID_DRAFT,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Publish draft announcement by ID',
        description: 'Publish a specific draft announcement by its ID',
      },
    }
  )
  .delete(
    '/:announcementId',
    async ({ params, status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.deleteDraftAnnouncement(params.announcementId)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: AnnouncementIdParams,
      response: {
        200: DeleteDraftAnnouncementResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete draft announcement by ID',
        description: 'Remove a specific draft announcement by its ID',
      },
    }
  )

export const AdminAnnouncementsController = new Elysia({
  prefix: '/announcements',
  tags: ['Admin Announcements'],
})
  .use([AuthGuardPlugin, AdminAnnouncementServicePlugin])
  .use(AdminDraftAnnouncementsController)
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
      }

      if (query.type === 'draft') {
        const result = await adminAnnouncementService.getDraftAnnouncements(pagingQuery)
        if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

        return status(200, result.value)
      }

      const result = await adminAnnouncementService.getAnnouncements()
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
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
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: AnnouncementIdParams,
      response: {
        200: GetPublishedAnnouncementResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.FILE_CREATE_SIGNED_URL_ERROR,
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
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: AnnouncementIdParams,
      body: PutPublishedAnnouncementBody,
      response: {
        200: PutPublishedAnnouncementResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
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
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: AnnouncementIdParams,
      response: {
        200: PublishedAnnouncementUnpublishedResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
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
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      params: AnnouncementIdParams,
      response: {
        200: DeletePublishedAnnouncementResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Delete announcement by ID',
        description: 'Remove a specific announcement by its ID',
      },
    }
  )
