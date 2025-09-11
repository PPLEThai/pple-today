import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  GetAnnouncementByIdParams,
  GetAnnouncementByIdResponse,
  ListAnnouncementByHashTagIdQuery,
  ListAnnouncementByHashTagIdResponse,
  ListAnnouncementByTopicIdParams,
  ListAnnouncementByTopicIdQuery,
  ListAnnouncementByTopicIdResponse,
  ListAnnouncementsQuery,
  ListAnnouncementsResponse,
  ListFollowedAnnouncementsQuery,
  ListFollowedAnnouncementsResponse,
} from './models'
import { AnnouncementServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'

export const AnnouncementsController = new Elysia({
  prefix: '/announcements',
  tags: ['Announcements'],
})
  .use([AnnouncementServicePlugin, AuthGuardPlugin])
  .get(
    '/',
    async ({ announcementService, status, query }) => {
      const result = await announcementService.listAnnouncements({
        cursor: query.cursor,
        limit: query.limit ?? 10,
      })

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      query: ListAnnouncementsQuery,
      response: {
        200: ListAnnouncementsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get all announcements',
        description: 'Fetch a list of all announcements',
      },
    }
  )
  .get(
    '/topic/:id',
    async ({ announcementService, params, status, query }) => {
      const result = await announcementService.listAnnouncementByTopicId(params.id, {
        cursor: query.cursor,
        limit: query.limit ?? 10,
      })

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      params: ListAnnouncementByTopicIdParams,
      query: ListAnnouncementByTopicIdQuery,
      response: {
        200: ListAnnouncementByTopicIdResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get announcements by topic ID',
        description: 'Fetch a list of announcements filtered by topic ID',
      },
    }
  )
  .get(
    '/followed',
    async ({ user, announcementService, status, query }) => {
      const result = await announcementService.listFollowedAnnouncements(user.id, {
        cursor: query.cursor,
        limit: query.limit ?? 10,
      })

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      query: ListFollowedAnnouncementsQuery,
      response: {
        200: ListFollowedAnnouncementsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get followed announcements',
        description: 'Fetch a list of announcements from followed topics',
      },
    }
  )
  .get(
    '/hashtag/:id',
    async ({ announcementService, query, status, params }) => {
      const result = await announcementService.listAnnouncementByHashTagId(params.id, {
        cursor: query.cursor,
        limit: query.limit ?? 10,
      })

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredLocalUser: true,
      query: ListAnnouncementByHashTagIdQuery,
      response: {
        200: ListAnnouncementByHashTagIdResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
      detail: {
        summary: 'Get announcements by hashtag ID',
        description: 'Fetch a list of announcements filtered by hashtag ID',
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
