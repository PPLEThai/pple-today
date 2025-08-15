import { cors } from '@elysiajs/cors'
import node from '@elysiajs/node'
import { swagger } from '@elysiajs/swagger'
import Elysia, { AnyElysia } from 'elysia'
import * as R from 'remeda'

import serverEnv from './config/env'
import { ApplicationController } from './modules'
import { AdminController } from './modules/admin'
import { VersionController } from './modules/version'
import { GlobalExceptionPlugin } from './plugins/global-exception'
import { GlobalLoggerPlugin } from './plugins/logger'
import { RequestIdPlugin } from './plugins/request-id'

import packageJson from '../package.json'

let app = new Elysia({ adapter: node() })
  .use([GlobalLoggerPlugin, RequestIdPlugin, GlobalExceptionPlugin, cors()])
  .use([ApplicationController, AdminController, VersionController])

if (serverEnv.ENABLE_SWAGGER) {
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
                authorizationUrl: `${serverEnv.DEVELOPMENT_OIDC_URL}/oauth/v2/authorize`,
                tokenUrl: `${serverEnv.DEVELOPMENT_OIDC_URL}/oauth/v2/token`,
                scopes: {
                  openid: 'OpenID scope',
                  profile: 'Profile scope',
                  phone: 'Phone scope',
                },
                'x-scalar-client-id': serverEnv.DEVELOPMENT_OIDC_CLIENT_ID,
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

  app = app.use(swaggerPlugin).get('/swagger', () => response.clone(), hooks)
}

app.listen(serverEnv.PORT, () => {
  console.log(`Server is running on http://localhost:${serverEnv.PORT}`)
})

export type ApplicationApiSchema = typeof ApplicationController
export type AdminApiSchema = typeof AdminController
