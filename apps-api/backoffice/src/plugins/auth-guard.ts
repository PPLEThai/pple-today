import node from '@elysiajs/node'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { InternalErrorCode, InternalErrorCodeSchemas } from '../dtos/error'
import { introspectAccessToken } from '../utils/jwt'

export const AuthGuardPlugin = new Elysia({
  adapter: node(),
  name: 'auth-guard-plugin',
})
  .decorate({
    async getCurrentUser(headers: Record<string, string | undefined>) {
      const token = headers['authorization']?.replace('Bearer ', '').trim()

      if (!token) return ok(null)

      return await introspectAccessToken(token)
    },
  })
  .macro({
    fetchUser: {
      async resolve({ headers, status, getCurrentUser }) {
        const user = await getCurrentUser(headers)

        if (user.isErr()) {
          if (user.error.code === InternalErrorCode.UNAUTHORIZED) {
            return { user: null }
          }

          return status(InternalErrorCodeSchemas[user.error.code].status, user.error)
        }

        return { user: user.value }
      },
    },
    requiredUser: {
      async resolve({ status, headers, getCurrentUser }) {
        const user = await getCurrentUser(headers)

        if (user.isErr()) {
          return status(InternalErrorCodeSchemas[user.error.code].status, user.error)
        }

        if (!user.value) {
          return status(401, {
            code: InternalErrorCode.UNAUTHORIZED,
            message: 'User not authenticated',
          })
        }

        return { user: user.value }
      },
    },
  })
  .as('scoped')
