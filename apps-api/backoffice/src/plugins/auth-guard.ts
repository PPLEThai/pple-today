import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { InternalErrorCode } from '../dtos/error'
import { mapErrorCodeToResponse } from '../utils/error'
import { introspectAccessToken } from '../utils/jwt'

export const AuthGuardPlugin = new Elysia({
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

          return mapErrorCodeToResponse(user.error, status)
        }

        return { user: user.value }
      },
    },
    requiredUser: {
      async resolve({ status, headers, getCurrentUser }) {
        const user = await getCurrentUser(headers)

        if (user.isErr()) {
          return mapErrorCodeToResponse(user.error, status)
        }

        if (!user.value) {
          return mapErrorCodeToResponse(
            { code: InternalErrorCode.UNAUTHORIZED, message: 'User not authenticated' },
            status
          )
        }

        return { user: user.value }
      },
    },
  })
  .as('scoped')
