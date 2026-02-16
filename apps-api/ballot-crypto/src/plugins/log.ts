import { StandaloneLoggerOptions } from '@bogeychan/elysia-logger/types'
import { loggerBuilder } from '@pple-today/api-common/plugins'
import Elysia from 'elysia'

import { ConfigServicePlugin } from './config'

export const ElysiaLoggerPlugin = (options: StandaloneLoggerOptions) => {
  return new Elysia({ name: `Logger-${options.name}` })
    .use(ConfigServicePlugin)
    .decorate(({ configService }) => ({
      loggerService: loggerBuilder(options),
      transport:
        configService.get('APP_ENV') === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
              },
            }
          : undefined,
    }))
}
