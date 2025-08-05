import { cors } from '@elysiajs/cors'
import node from '@elysiajs/node'
import { swagger } from '@elysiajs/swagger'
import Elysia from 'elysia'

import serverEnv from './config/env'
import { InternalErrorCode } from './dtos/error'
import { ApplicationController } from './modules'
import { AdminController } from './modules/admin'

import packageJson from '../package.json'

let app = new Elysia({ adapter: node() })
  .onError(({ status, code, error }) => {
    if ('response' in error) return status(error.code, error.response)
    if (code === 'INTERNAL_SERVER_ERROR')
      return status(500, {
        error: {
          code: InternalErrorCode.INTERNAL_SERVER_ERROR,
          message: 'An internal error occurred',
        },
      })

    if (code === 'VALIDATION')
      return status(422, {
        error: {
          code: InternalErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          data: error.message,
        },
      })

    if (code === 'NOT_FOUND')
      return status(404, {
        error: {
          code: InternalErrorCode.NOT_FOUND,
          message: 'Resource not found',
        },
      })

    if (code === 'INVALID_FILE_TYPE')
      return status(400, {
        error: {
          code: InternalErrorCode.BAD_REQUEST,
          message: 'Invalid file type',
        },
      })

    return status(500, {
      error: {
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An internal error occurred',
      },
    })
  })
  .use(cors())
  .use(ApplicationController)
  .use(AdminController)
  .get('/versions', ({ status }) => {
    const body = JSON.stringify({
      name: packageJson.name,
      version: packageJson.version,
    })

    return status(200, body)
  })

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
