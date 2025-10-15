import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia, { t } from 'elysia'

import {
  DeleteAnnouncementParams,
  DeleteAnnouncementResponse,
  GetAnnouncementByIdParams,
  GetAnnouncementByIdResponse,
  GetAnnouncementsQuery,
  GetAnnouncementsResponse,
  PostAnnouncementBody,
  PostAnnouncementResponse,
  PutAnnouncementBody,
  PutAnnouncementParams,
  PutAnnouncementResponse,
} from './models'
import { AdminAnnouncementServicePlugin } from './services'

import { AdminAuthGuardPlugin } from '../../../plugins/admin-auth-guard'

export const AdminAnnouncementsController = new Elysia({
  prefix: '/announcements',
  tags: ['Admin Announcements'],
})
  .use([AdminAuthGuardPlugin, AdminAnnouncementServicePlugin])
  .get(
    '/',
    async ({ query, status, adminAnnouncementService }) => {
      const pagingQuery: GetAnnouncementsQuery = {
        limit: query.limit ?? 10,
        page: query.page ?? 1,
        status: query.status,
        search: query.search,
      }

      const result = await adminAnnouncementService.getAnnouncements(pagingQuery)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      query: t.Partial(GetAnnouncementsQuery),
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
  .post(
    '/',
    async ({ body, status, adminAnnouncementService }) => {
      const result = await adminAnnouncementService.createAnnouncement(body)
      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(201, result.value)
    },
    {
      requiredLocalUser: true,
      body: PostAnnouncementBody,
      response: {
        201: PostAnnouncementResponse,
        ...createErrorSchema(
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Create a new announcement',
        description: 'Create a new announcement with the provided details',
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
      params: GetAnnouncementByIdParams,
      response: {
        200: GetAnnouncementByIdResponse,
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
      params: PutAnnouncementParams,
      body: PutAnnouncementBody,
      response: {
        200: PutAnnouncementResponse,
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
      params: DeleteAnnouncementParams,
      response: {
        200: DeleteAnnouncementResponse,
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
