import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { ElysiaLoggerInstance, ElysiaLoggerPlugin } from '@pple-today/api-common/plugins'
import { err } from '@pple-today/api-common/utils'
import { Parse } from '@sinclair/typebox/value'
import Elysia from 'elysia'
import { Err, fromPromise, ok } from 'neverthrow'

import {
  GetAllEventsResponse,
  GetTodayEventsResponse,
  GetUpcomingEventsResponse,
  PPLEActivity,
  PPLETodayActivity,
  PPLEUpcomingActivity,
} from './models'

import { ConfigServicePlugin } from '../../plugins/config'

export class EventService {
  private caching = new Map<
    string,
    {
      expiresAt: number
      data: unknown
    }
  >()
  private CACHE_TTL_MS: number

  private getCacheKeyForTodayEvents(query: { page: number; limit: number }) {
    return `today-events-page-${query.page}-limit-${query.limit}`
  }

  private getCacheKeyForAllEvents(query: { page: number; limit: number }) {
    return `all-events-page-${query.page}-limit-${query.limit}`
  }

  private getCacheKeyForUpcomingEvents(query: { page: number; limit: number }) {
    return `upcoming-events-page-${query.page}-limit-${query.limit}`
  }

  private getCacheValue<T>(key: string) {
    const cache = this.caching.get(key)

    if (!cache) return null
    if (cache.expiresAt < Date.now()) {
      this.caching.delete(key)
      return null
    }

    return cache.data as T
  }

  private setCacheValue(key: string, data: unknown) {
    this.caching.set(key, {
      expiresAt: Date.now() + this.CACHE_TTL_MS,
      data,
    })
  }

  private transformEventData(
    data: (PPLEActivity | PPLETodayActivity | PPLEUpcomingActivity)['result'][number]
  ) {
    return {
      id: data.event_data.ID.toString(),
      name: data.event_data.title,
      location: data.event_data.event_detail.venue,
      startAt: new Date(data.event_data.event_detail.date),
      endAt: new Date(data.event_data.event_detail.date),
      image: data.event_data.image,
      url: data.event_data.url,
    }
  }

  constructor(
    private readonly config: { activityBaseUrl: string; cacheTimeSec?: number },
    private readonly loggerService: ElysiaLoggerInstance
  ) {
    this.CACHE_TTL_MS = (this.config.cacheTimeSec ?? 300) * 1000
  }

  async getTodayEvents(query: { page: number; limit: number }) {
    if (query.page <= 0) query.page = 1
    if (query.limit <= 0) query.limit = 10

    const todayCacheKey = this.getCacheKeyForTodayEvents(query)
    const todayCache = this.getCacheValue<GetTodayEventsResponse>(todayCacheKey)

    if (todayCache) return ok(todayCache)

    const url = new URL(`${this.config.activityBaseUrl}/get-last-event-today/`)

    url.searchParams.append('current_page', query.page.toString())
    url.searchParams.append('limit', query.limit.toString())

    const result = await fromPromise(
      (async () => {
        const resp = await fetch(url.toString())
        if (!resp.ok) {
          throw {
            code: InternalErrorCode.EVENT_FAILED_TO_FETCH,
            message: `Failed to fetch today's events: ${resp.statusText}`,
          }
        }

        const data = await resp.json()
        const parsedResult = Parse(PPLETodayActivity, data)

        return {
          ...parsedResult,
          result: parsedResult.result.map((item) => {
            return {
              ...item,
              event_data: {
                ...item.event_data,
                is_upcoming: true,
              },
            }
          }),
        }
      })(),
      (err) => {
        this.loggerService.warn({
          message: "Failed to fetch today's events",
          error: err instanceof Error ? err.message : err,
        })

        if (err instanceof Err) {
          return err.error as {
            code: 'EVENT_FAILED_TO_FETCH'
            message: string
          }
        }

        return {
          code: InternalErrorCode.INTERNAL_SERVER_ERROR,
          message: "Failed to fetch today's events",
        }
      }
    )

    if (result.isErr()) {
      return err(result.error)
    }

    const parsedResult = {
      ...result.value,
      result: result.value.result.map(this.transformEventData),
    }
    this.setCacheValue(todayCacheKey, parsedResult)

    return ok(parsedResult)
  }

  async getUpcomingEvents(query: { page: number; limit: number }) {
    if (query.page <= 0) query.page = 1
    if (query.limit <= 0) query.limit = 10

    const upcomingCacheKey = this.getCacheKeyForUpcomingEvents(query)
    const upcomingCache = this.getCacheValue<GetUpcomingEventsResponse>(upcomingCacheKey)

    if (upcomingCache) return ok(upcomingCache)

    const url = new URL(`${this.config.activityBaseUrl}/get-last-event-upcoming`)

    url.searchParams.append('current_page', query.page.toString())
    url.searchParams.append('limit', query.limit.toString())

    const result = await fromPromise(
      (async () => {
        const resp = await fetch(url.toString())
        if (!resp.ok) {
          throw {
            code: InternalErrorCode.EVENT_FAILED_TO_FETCH,
            message: `Failed to fetch upcoming events: ${resp.statusText}`,
          }
        }

        const data = await resp.json()
        const parsedResult = Parse(PPLEUpcomingActivity, data)

        return parsedResult
      })(),
      (err) => {
        this.loggerService.warn({
          message: 'Failed to fetch upcoming events',
          error: err instanceof Error ? err.message : err,
        })

        if (err instanceof Err) {
          return err.error as {
            code: 'EVENT_FAILED_TO_FETCH'
            message: string
          }
        }

        return {
          code: InternalErrorCode.INTERNAL_SERVER_ERROR,
          message: 'Failed to fetch upcoming events',
        }
      }
    )

    if (result.isErr()) {
      return err(result.error)
    }

    const parsedResult = {
      ...result.value,
      result: result.value.result.map(this.transformEventData),
    }
    this.setCacheValue(upcomingCacheKey, parsedResult)

    return ok(parsedResult)
  }

  async getAllEvents(query: { page: number; limit: number }) {
    if (query.page <= 0) query.page = 1
    if (query.limit <= 0) query.limit = 10

    const allEventsCacheKey = this.getCacheKeyForAllEvents(query)
    const allEventsCache = this.getCacheValue<GetAllEventsResponse>(allEventsCacheKey)

    if (allEventsCache) return ok(allEventsCache)

    const url = new URL(`${this.config.activityBaseUrl}/get-last-event/`)

    url.searchParams.append('current_page', query.page.toString())
    url.searchParams.append('limit', query.limit.toString())

    const result = await fromPromise(
      (async () => {
        const resp = await fetch(url.toString())
        if (!resp.ok) {
          throw {
            code: InternalErrorCode.EVENT_FAILED_TO_FETCH,
            message: `Failed to fetch today's events: ${resp.statusText}`,
          }
        }

        const data = await resp.json()
        const parsedResult = Parse(PPLEActivity, data)

        return parsedResult
      })(),
      (err) => {
        this.loggerService.warn({
          message: "Failed to fetch today's events",
          error: err instanceof Error ? err.message : err,
        })

        if (err instanceof Err) {
          return err.error as {
            code: 'EVENT_FAILED_TO_FETCH'
            message: string
          }
        }

        return {
          code: InternalErrorCode.INTERNAL_SERVER_ERROR,
          message: "Failed to fetch today's events",
        }
      }
    )

    if (result.isErr()) {
      return err(result.error)
    }

    const parsedResult = {
      ...result.value,
      result: result.value.result.map(this.transformEventData),
    }
    this.setCacheValue(allEventsCacheKey, parsedResult)

    return ok(parsedResult)
  }
}

export const EventServicePlugin = new Elysia({
  name: 'EventServicePlugin',
})
  .use([ConfigServicePlugin, ElysiaLoggerPlugin({ name: 'EventService' })])
  .decorate(({ configService, loggerService }) => ({
    eventService: new EventService(
      {
        activityBaseUrl: configService.get('PPLE_ACTIVITY_BASE_URL'),
        cacheTimeSec: configService.get('PPLE_ACTIVITY_CACHE_TIME'),
      },
      loggerService
    ),
  }))
