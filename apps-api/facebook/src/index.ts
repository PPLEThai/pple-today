import { cors } from '@elysiajs/cors'
import node from '@elysiajs/node'
import { loggerBuilder, RequestIdPlugin } from '@pple-today/api-common/plugins'
import Elysia from 'elysia'

import { FacebookWebhookController } from './modules/facebook/webhook'
import { VersionController } from './modules/version'
import { ConfigServicePlugin } from './plugins/config'
import { GlobalExceptionPlugin } from './plugins/global-exception'

const configService = ConfigServicePlugin.decorator.configService

const app = new Elysia({ adapter: node() })
  .use([
    loggerBuilder({
      name: 'Global Logger',
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
      redact: [
        'request.headers.cookie',
        'request.headers.authorization',
        'body.accessToken',
        'body.facebookPageAccessToken',
      ],
    }).into({
      customProps: (ctx) => {
        const responseBody =
          ctx.response || ('response' in ctx.error ? ctx.error.response : undefined)

        return {
          body: ctx.body,
          query: ctx.query,
          params: ctx.params,
          response: responseBody,
        }
      },
      autoLogging: {
        ignore: (ctx) => {
          if (ctx.isError) return false
          if (!ctx.isError && 'response' in ctx.error) return true

          return ctx.path.startsWith('/health') || ctx.path.startsWith('/version')
        },
      },
    }),
    RequestIdPlugin,
    GlobalExceptionPlugin,
    ConfigServicePlugin,
    cors(),
  ])
  .use([FacebookWebhookController, VersionController])

const PORT = configService.get('PORT')

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})
