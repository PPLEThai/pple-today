import { logger } from '@bogeychan/elysia-logger'
import { ElysiaStreamLoggerOptions } from '@bogeychan/elysia-logger/types'
import Elysia from 'elysia'

import serverEnv from '../config/env'

export const loggerPluginBuilder = (config: ElysiaStreamLoggerOptions) => {
  return logger({
    ...config,
    level: 'info',
    customProps: (ctx) => {
      return {
        method: ctx.request.method,
        path: ctx.path,
        headers: ctx.headers,
        body: ctx.body,
        response: ctx.response,
        query: ctx.query,
        params: ctx.params,
      }
    },
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
    redact: ['headers.cookie', 'headers.authorization', '*.accessToken'],
    autoLogging: false,
  })
}

export const GlobalLoggerPlugin = new Elysia({
  name: 'global-logger-plugin',
})
  .use(loggerPluginBuilder({ name: 'global-logger' }))
  .onAfterResponse(({ error, log }) => {
    const _error = error as any
    console.error('Error in onAfterResponse:', _error)

    if ('response' in _error) {
      log.error({
        error,
      })
    } else if (_error) {
      log.warn({
        error,
      })
    } else {
      log.info({})
    }
  })
  .onError(({ error, log }) => {
    log?.error({
      error,
    })
  })
  .as('global')
