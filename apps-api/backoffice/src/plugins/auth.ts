import node from '@elysiajs/node'
import Elysia, { t } from 'elysia'

import { InternalErrorCode } from '../dtos/error'
import { introspectAccessToken } from '../utils/jwt'

export const authPlugin = new Elysia({
  adapter: node(),
  name: 'auth-plugin',
})
  .guard({
    as: 'scoped',
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

        if (!user) {
          return status(401, {
            error: {
              code: InternalErrorCode.UNAUTHORIZED,
              message: 'Invalid or expired token',
            },
          })
        }

        return { oidcUser: user }
      },
    },
  })
