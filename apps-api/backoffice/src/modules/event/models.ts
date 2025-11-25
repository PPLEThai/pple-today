import { PPLEActivity } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const GetAllEventsQuery = t.Object({
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
})
export type GetAllEventsQuery = Static<typeof GetAllEventsQuery>

export const GetAllEventsResponse = PPLEActivity
export type GetAllEventsResponse = Static<typeof GetAllEventsResponse>

export const GetTodayEventsQuery = t.Object({
  page: t.Optional(t.Number({ default: 1 })),
  limit: t.Optional(t.Number({ default: 10 })),
})
export type GetTodayEventsQuery = Static<typeof GetTodayEventsQuery>

export const GetTodayEventsResponse = PPLEActivity
export type GetTodayEventsResponse = Static<typeof GetTodayEventsResponse>
