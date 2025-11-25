import { InternalErrorCode, PPLEActivity, PPLETodayActivity } from '@pple-today/api-common/dtos'
import { ElysiaLoggerInstance, ElysiaLoggerPlugin } from '@pple-today/api-common/plugins'
import { err } from '@pple-today/api-common/utils'
import { Parse } from '@sinclair/typebox/value'
import Elysia from 'elysia'
import { fromPromise, ok } from 'neverthrow'

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
    if (query.page <= 0) query.page = 1
    if (query.limit <= 0) query.limit = 10

    return `all-events-page-${query.page}-limit-${query.limit}`
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
    const todayCache = this.getCacheValue<PPLEActivity>(todayCacheKey)

    if (todayCache) return ok(todayCache)

    const url = new URL(`${this.config.activityBaseUrl}/get-last-event-today/`)

    url.searchParams.append('current_page', query.page.toString())
    url.searchParams.append('limit', query.limit.toString())

    const result = await fromPromise(
      (async () => {
        const resp = await fetch(url.toString())
        if (!resp.ok) {
          throw {
            code: InternalErrorCode.INTERNAL_SERVER_ERROR,
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

        return {
          code: InternalErrorCode.INTERNAL_SERVER_ERROR,
          message: "Failed to fetch today's events",
        }
      }
    )

    if (result.isErr()) {
      return err(result.error)
    }

    const parsedResult = result.value
    this.setCacheValue(todayCacheKey, parsedResult)

    return ok(parsedResult)
  }

  async getAllEvents(query: { page: number; limit: number }) {
    if (query.page <= 0) query.page = 1
    if (query.limit <= 0) query.limit = 10

    const allEventsCacheKey = this.getCacheKeyForAllEvents(query)
    const allEventsCache = this.getCacheValue<PPLEActivity>(allEventsCacheKey)

    if (allEventsCache) return ok(allEventsCache)

    const url = new URL(`${this.config.activityBaseUrl}/get-last-event/`)

    url.searchParams.append('current_page', query.page.toString())
    url.searchParams.append('limit', query.limit.toString())

    const result = await fromPromise(
      (async () => {
        const resp = await fetch(url.toString())
        if (!resp.ok) {
          throw {
            code: InternalErrorCode.INTERNAL_SERVER_ERROR,
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

        return {
          code: InternalErrorCode.INTERNAL_SERVER_ERROR,
          message: "Failed to fetch today's events",
        }
      }
    )

    if (result.isErr()) {
      return err(result.error)
    }

    const parsedResult = result.value
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
