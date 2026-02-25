import { cors } from '@elysiajs/cors'
import node from '@elysiajs/node'
import { swagger } from '@elysiajs/swagger'
import {
  GlobalExceptionPlugin,
  loggerBuilder,
  RequestIdPlugin,
} from '@pple-today/api-common/plugins'
import Elysia, { AnyElysia } from 'elysia'
import * as R from 'remeda'

import { ApplicationController } from './modules'
import { VersionController } from './modules/version'
import { ConfigServicePlugin } from './plugins/config'

import packageJson from '../package.json'

const configService = ConfigServicePlugin.decorator.configService

let app = new Elysia({ adapter: node() })
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
      redact: ['headers.cookie', 'headers.authorization'],
    }).into({
      customProps: (ctx) => {
        const errorResponseBody = 'response' in ctx.error ? ctx.error.response : {}

        return {
          headers: ctx.headers,
          query: ctx.query,
          params: ctx.params,
          ...errorResponseBody,
        }
      },
      autoLogging: {
        ignore: (ctx) => {
          if (ctx.isError) return false
          if (!ctx.isError && 'response' in ctx.error) return true

          return (
            ctx.path.startsWith('/health') ||
            ctx.path.startsWith('/swagger') ||
            ctx.path.startsWith('/versions')
          )
        },
      },
    }),
    RequestIdPlugin,
    GlobalExceptionPlugin,
    ConfigServicePlugin,
    cors(),
  ])
  .use([ApplicationController, VersionController])

if (process.env.ENABLE_SWAGGER === 'true') {
  const getTagsFromController = (controller: AnyElysia) =>
    R.pipe(
      controller,
      R.prop('router'),
      R.prop('history'),
      R.flatMap((history) => R.pipe(history, R.prop('hooks'), R.prop('detail'), R.prop('tags'))),
      R.unique(),
      R.sort((a, b) => a.localeCompare(b))
    )

  const TAG_GROUPS: any = {
    'x-tagGroups': [
      {
        name: 'Application',
        tags: getTagsFromController(ApplicationController),
      },
      {
        name: 'System',
        tags: getTagsFromController(VersionController),
      },
    ],
  }

  const swaggerPlugin = swagger({
    documentation: {
      info: {
        title: 'Ballot Crypto API',
        version: packageJson.version,
      },
      ...TAG_GROUPS,
    },
  })

  const response = swaggerPlugin.router.history[0].handler as unknown as Response
  const hooks = swaggerPlugin.router.history[0].hooks

  let body: string = ''

  app = app.use(swaggerPlugin).get(
    '/swagger',
    async () => {
      if (!body) body = await response.text()
      return new Response(body, {
        headers: {
          'content-type': 'text/html; charset=utf8',
        },
      })
    },
    hooks
  )
}

app.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`)
})
