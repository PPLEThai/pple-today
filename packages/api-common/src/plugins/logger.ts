import {
  createPinoLogger,
  isContext,
  isRequest,
  serializeRequest,
  serializers as defaultSerializer,
} from '@bogeychan/elysia-logger'
import { LoggerOptions, StandaloneLoggerOptions } from '@bogeychan/elysia-logger/types'
import { omit } from 'remeda'

const PinoLevelToSeverityLookup: Record<string, string> = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
}

const formatters = {
  level(label, number) {
    return {
      severity: PinoLevelToSeverityLookup[label] || PinoLevelToSeverityLookup['info'],
      level: number,
    }
  },
  log(object) {
    if (isContext(object)) {
      const log: Record<string, any> = {
        query: object.query,
        params: object.params,
        path: object.path,
        headers: Object.fromEntries(object.request.headers.entries()),
      }

      if (object.isError) {
        object.store.startTime ??= 0
        object.store.endTime = performance.now()

        object.store.responseTime =
          (object.store.endTime as number) - (object.store.startTime as number)

        if (object.error instanceof Error && 'code' in object.error) {
          log.message = object.error.message
          log.code = object.error.code
        } else {
          const { code, error, request } = object

          log.code = code
          log.originalUrl = request.url

          if ('message' in error) {
            log.message = error.message
          } else if ('code' in error && 'response' in error) {
            const response = (error.response as any).error
            log.message = `HTTP ${error.code}: Code ${response.code} with message ${response.message}`

            if (error.code >= 500) {
              log.stack = response.stack
            }
          } else {
            log.message = 'Unknown error'
          }
        }
      }

      if (object.store.responseTime) {
        log.responseTime = object.store.responseTime
      }

      return log
    } else if (isRequest(object)) {
      return serializeRequest(object)
    }
    return object
  },
} satisfies LoggerOptions['formatters']

const serializers = {
  ...defaultSerializer,
  body: (body: any) => {
    if ('rawBody' in body) {
      return omit(body, ['rawBody'])
    }

    return body
  },
} satisfies LoggerOptions['serializers']

export const loggerBuilder = (config: StandaloneLoggerOptions) => {
  return createPinoLogger({
    ...config,
    serializers,
    formatters,
  })
}

export type ElysiaLoggerInstance = ReturnType<typeof createPinoLogger>

/**
 * Resolve the request path inside an `autoLogging.ignore` callback.
 *
 * Elysia's node adapter put `path` on the logger context; the native Bun
 * adapter does not, and only exposes the full `request.url`. Reading it through
 * this helper keeps the ignore rules working on either adapter.
 */
export const getLogContextPath = (ctx: { path?: string; request?: { url?: string } }): string => {
  if (typeof ctx.path === 'string') return ctx.path

  const url = ctx.request?.url
  if (!url) return ''

  // Slice the pathname out directly — this runs on every request, so avoid
  // constructing a URL just to read one field.
  const pathStart = url.indexOf('/', url.indexOf('://') + 3)
  if (pathStart === -1) return '/'

  const queryStart = url.indexOf('?', pathStart)
  return queryStart === -1 ? url.slice(pathStart) : url.slice(pathStart, queryStart)
}
