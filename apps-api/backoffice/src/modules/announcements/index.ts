import Elysia from 'elysia'

import {
  GetAnnouncementByIdParams,
  GetAnnouncementByIdResponse,
  GetAnnouncementsQuery,
  GetAnnouncementsResponse,
} from './models'
import { AnnouncementServicePlugin } from './services'

import { InternalErrorCode } from '../../dtos/error'
import { AuthGuardPlugin } from '../../plugins/auth-guard'
import { createErrorSchema, mapErrorCodeToResponse } from '../../utils/error'

export const AnnouncementsController = new Elysia({
  prefix: '/announcements',
  tags: ['Announcements'],
})
  .use([AnnouncementServicePlugin, AuthGuardPlugin])
  .get(
    '/',
    async ({ announcementService, status, query }) => {
      const result = await announcementService.getAnnouncements({
        limit: query.limit ?? 10,
        page: query.page ?? 1,
      })

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      query: GetAnnouncementsQuery,
      response: {
        200: GetAnnouncementsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get all announcements',
        description: 'Fetch a list of all announcements',
      },
    }
  )
  .get(
    '/:id',
    async ({ announcementService, params, status }) => {
      const announcement = await announcementService.getAnnouncementById(params.id)

      if (announcement.isErr()) {
        return mapErrorCodeToResponse(announcement.error, status)
      }

      return status(200, announcement.value)
    },
    {
      params: GetAnnouncementByIdParams,
      response: {
        200: GetAnnouncementByIdResponse,
        ...createErrorSchema(
          InternalErrorCode.ANNOUNCEMENT_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get an announcement by ID',
        description: 'Get a specific announcement by ID',
      },
    }
  )
  // TODO: Implement marking announcements as read after notifications are implemented
  .post(
    '/:id/read',
    async ({ status }) => {
      return mapErrorCodeToResponse(
        {
          code: InternalErrorCode.NOT_IMPLEMENTED,
          message: 'Marking announcements as read is not implemented yet',
        },
        status
      )
    },
    {
      detail: {
        summary: 'Mark announcement as read',
        description: 'Mark a specific announcement as read',
        hide: true,
      },
    }
  )
