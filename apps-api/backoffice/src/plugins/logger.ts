import {
  createPinoLogger,
  isContext,
  isRequest,
  serializeRequest,
  serializers as defaultSerializer,
} from '@bogeychan/elysia-logger'
import { LoggerOptions, StandaloneLoggerOptions } from '@bogeychan/elysia-logger/types'
import node from '@elysiajs/node'
import Elysia from 'elysia'

import serverEnv from '../config/env'

const formatters = {
  log(object) {
    if (isContext(object)) {
      const log: Record<string, any> = {
        request: object.request,
      }

      if (object.isError) {
        const { code, error } = object

        log.code = code

        if ('message' in error) {
          log.message = error.message
        } else if ('code' in error && 'response' in error) {
          const response: any = error.response
          log.message = `HTTP ${error.code}: Code ${response.error.code} with message ${response.error.message}`
        } else {
          log.message = 'Unknown error'
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
    transport:
      serverEnv.APP_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
            },
          }
        : undefined,
    redact: ['request.headers.cookie', 'request.headers.authorization', 'body.accessToken'],
    serializers,
    formatters,
  })
}

export const GlobalLoggerPlugin = loggerBuilder({
  name: 'Global Logger',
}).into({
  customProps: (ctx) => {
    return {
      body: ctx.body,
      response: ctx.response,
    }
  },
  autoLogging: {
    ignore: (ctx) => {
      return (
        ctx.path.startsWith('/health') ||
        ctx.path.startsWith('/swagger') ||
        ctx.path.startsWith('/versions')
      )
    },
  },
})

export const ElysiaLoggerPlugin = (options: StandaloneLoggerOptions) => {
  return new Elysia({ name: `Logger-${options.name}`, adapter: node() }).decorate(() => ({
    loggerService: loggerBuilder(options),
  }))
}

export type ElysiaLoggerInstance = ReturnType<typeof createPinoLogger>
