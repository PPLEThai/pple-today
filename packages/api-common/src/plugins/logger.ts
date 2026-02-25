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
        request: object.request,
      }

      if (object.isError) {
        if (object.error instanceof Error && 'code' in object.error) {
          log.message = object.error.message
          log.code = object.error.code
          log.stack = object.error.stack
        } else {
          const { code, error } = object

          log.code = code

          if ('message' in error) {
            log.message = error.message
          } else if ('code' in error && 'response' in error) {
            const response = (error.response as any).error
            log.message = `HTTP ${error.code}: Code ${response.code} with message ${response.message}`
            log.stack = response.stack
          } else {
            log.message = 'Unknown error'
          }
        }
      } else {
        if (object.store.responseTime) {
          log.responseTime = object.store.responseTime
        }
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
  request: (request: Request) => {
    const url = new URL(request.url)

    return {
      ...serializeRequest(request),
      path: url.pathname,
      headers: Object.fromEntries(request.headers.entries()),
    }
  },
}

export const loggerBuilder = (config: StandaloneLoggerOptions) => {
  return createPinoLogger({
    ...config,
    serializers,
    formatters,
  })
}

export type ElysiaLoggerInstance = ReturnType<typeof createPinoLogger>
