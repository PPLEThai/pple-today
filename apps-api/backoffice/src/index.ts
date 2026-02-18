import cors from '@elysiajs/cors'
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
import { AdminController } from './modules/admin'
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
      redact: [
        'request.headers.cookie',
        'request.headers.authorization',
        'body.accessToken',
        'body.facebookPageAccessToken',
        'body.deviceToken',
        'body.encryptedBallot',
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
          if (ctx.isError) {
            // NOTE: Ignore errors from Facebook webhook when the error code is FACEBOOK_WEBHOOK_NOT_SUPPORTED
            return (
              ctx.path.startsWith('/facebook/webhook') &&
              'code' in ctx.error &&
              ctx.error.code === 'FACEBOOK_WEBHOOK_NOT_SUPPORTED'
            )
          }
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
  .use([ApplicationController, AdminController, VersionController])

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
        name: 'Admin',
        tags: getTagsFromController(AdminController),
      },
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
        title: 'PPLE Today API',
        version: packageJson.version,
      },
      ...TAG_GROUPS,
      components: {
        securitySchemes: {
          accessToken: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Bearer Token',
          },
          _developmentLogin: {
            type: 'oauth2',
            flows: {
              authorizationCode: {
                authorizationUrl: `${configService.get('DEVELOPMENT_OIDC_URL')}/oauth/v2/authorize`,
                tokenUrl: `${configService.get('DEVELOPMENT_OIDC_URL')}/oauth/v2/token`,
                scopes: {
                  openid: 'OpenID scope',
                  profile: 'Profile scope',
                  phone: 'Phone scope',
                },
                'x-scalar-client-id': configService.get('DEVELOPMENT_OIDC_CLIENT_ID'),
                'x-usePkce': 'SHA-256',
                selectedScopes: ['openid', 'profile', 'phone'],
              } as any,
            },
            description: 'Development login for testing purposes',
          },
        },
      },
      security: [{ _developmentLogin: [] }],
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
