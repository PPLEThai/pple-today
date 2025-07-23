import node from '@elysiajs/node'
import Elysia, { t } from 'elysia'

import { InternalErrorCode, InternalErrorCodeSchemas } from '../dtos/error'
import { introspectAccessToken } from '../utils/jwt'

export const AuthGuardPlugin = new Elysia({
  adapter: node(),
  name: 'auth-guard-plugin',
})
  .guard({
    headers: t.Object({
      authorization: t.String({
        description: 'Bearer token for authentication',
      }),
    }),
  })
  .macro({
    getOIDCUser: {
      async resolve({ status, headers }) {
        if (!headers['authorization'] || !headers['authorization'].startsWith('Bearer ')) {
          return status(401, {
            error: {
              code: InternalErrorCode.UNAUTHORIZED,
              message: 'Authorization header is missing or invalid',
            },
          })
        }
        const bearerToken = headers['authorization'].replace('Bearer ', '').trim()
        const user = await introspectAccessToken(bearerToken)

        if ('error' in user) {
          return status(InternalErrorCodeSchemas[user.error.code].status, user.error)
        }

        return { oidcUser: user }
      },
    },
  })
  .as('scoped')
