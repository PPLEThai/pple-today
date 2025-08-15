import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { InternalErrorCode } from '../dtos/error'
import { AuthRepositoryPlugin } from '../modules/auth/repository'
import { err, mapErrorCodeToResponse } from '../utils/error'
import { introspectAccessToken } from '../utils/jwt'
import { mapRawPrismaError } from '../utils/prisma'

export const AuthGuardPlugin = new Elysia({
  name: 'AuthGuardPlugin',
})
  .use([AuthRepositoryPlugin])
  .decorate(({ authRepository }) => ({
    async getOIDCUser(headers: Record<string, string | undefined>) {
      const token = headers['authorization']?.replace('Bearer ', '').trim()
      if (!token)
        return err({ code: InternalErrorCode.UNAUTHORIZED, message: 'User not authenticated' })

      return await introspectAccessToken(token)
    },
    async getCurrentUser(headers: Record<string, string | undefined>) {
      const oidcUserResult = await this.getOIDCUser(headers)
      if (oidcUserResult.isErr()) return err(oidcUserResult.error)

      const oidcUser = oidcUserResult.value
      if (!oidcUser)
        return err({ code: InternalErrorCode.UNAUTHORIZED, message: 'User not authenticated' })

      const user = await authRepository.getUserById(oidcUser.sub)

      if (user.isErr())
        return mapRawPrismaError(user.error, {
          RECORD_NOT_FOUND: {
            code: InternalErrorCode.UNAUTHORIZED,
            message: 'Please register first',
          },
        })

      return ok(user.value)
    },
  }))
  .macro({
    fetchOIDCUser: {
      async resolve({ headers, status, getOIDCUser }) {
        const oidcUserResult = await getOIDCUser(headers)

        if (oidcUserResult.isErr()) return mapErrorCodeToResponse(oidcUserResult.error, status)

        return { oidcUser: oidcUserResult.value }
      },
    },
    fetchLocalUser: {
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
    requiredLocalUser: {
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
