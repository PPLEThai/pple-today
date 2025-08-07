import { cors } from '@elysiajs/cors'
import node from '@elysiajs/node'
import { swagger } from '@elysiajs/swagger'
import Elysia from 'elysia'

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
  app = app.use(
    swagger({
      documentation: {
        info: {
          title: 'PPLE Today API',
          version: packageJson.version,
        },
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
  )
}

app.listen(serverEnv.PORT, () => {
  console.log(`Server is running on http://localhost:${serverEnv.PORT}`)
})

export type ApplicationApiSchema = typeof ApplicationController
export type AdminApiSchema = typeof AdminController
