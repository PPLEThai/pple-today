import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  GetAllEventsQuery,
  GetAllEventsResponse,
  GetTodayEventsQuery,
  GetTodayEventsResponse,
} from './models'
import { EventServicePlugin } from './services'

export const EventsController = new Elysia({
  prefix: '/events',
  tags: ['Events'],
})
  .use(EventServicePlugin)
  .get(
    '/',
    async ({ status, query, eventService }) => {
      const eventResult = await eventService.getAllEvents({
        page: query.page ?? 1,
        limit: query.limit ?? 10,
      })

      if (eventResult.isErr()) {
        return mapErrorCodeToResponse(eventResult.error, status)
      }

      return status(200, eventResult.value)
    },
    {
      detail: {
        summary: 'Get all events',
        description: 'Retrieve a paginated list of all events.',
      },
      query: GetAllEventsQuery,
      response: {
        200: GetAllEventsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .get(
    '/today',
    async ({ status, query, eventService }) => {
      const eventResult = await eventService.getTodayEvents({
        page: query.page ?? 1,
        limit: query.limit ?? 10,
      })

      if (eventResult.isErr()) {
        return mapErrorCodeToResponse(eventResult.error, status)
      }

      return status(200, eventResult.value)
    },
    {
      detail: {
        summary: "Get today's events",
        description: "Retrieve a paginated list of today's events.",
      },
      query: GetTodayEventsQuery,
      response: {
        200: GetTodayEventsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
