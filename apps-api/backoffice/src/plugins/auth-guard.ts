import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err, mapErrorCodeToResponse, mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'
import * as R from 'remeda'

import { ConfigServicePlugin } from './config'

import { AuthRepository, AuthRepositoryPlugin } from '../modules/auth/repository'
import { introspectAccessToken } from '../utils/jwt'

export class AuthGuard {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly oidcConfig: {
      oidcClientId: string
      oidcUrl: string
      oidcPrivateJwtKey: string
      oidcKeyId: string
    }
  ) {}

  async getOIDCUser(headers: Record<string, string | undefined>) {
    const token = headers['authorization']?.replace('Bearer', '').trim()
    if (!token)
      return err({ code: InternalErrorCode.UNAUTHORIZED, message: 'User not authenticated' })

    return await introspectAccessToken(token, this.oidcConfig)
  }

  async checkUserHasRole(headers: Record<string, string | undefined>, roles: string[]) {
    const user = await this.getCurrentUser(headers)

    if (user.isErr()) return mapRepositoryError(user.error)

    const intersectionRoles = R.intersection(user.value.roles, roles)

    return ok({
      isAllowed: intersectionRoles.length > 0,
      user: user.value,
    })
  }

  async getCurrentUser(headers: Record<string, string | undefined>) {
    const oidcUserResult = await this.getOIDCUser(headers)
    if (oidcUserResult.isErr()) return err(oidcUserResult.error)

    const oidcUser = oidcUserResult.value
    if (!oidcUser)
      return err({ code: InternalErrorCode.UNAUTHORIZED, message: 'User not authenticated' })

    const user = await this.authRepository.getUserById(oidcUser.sub)

    if (user.isErr())
      return mapRepositoryError(user.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.UNAUTHORIZED,
          message: 'Please register first',
        },
      })

    return ok({
      ...user.value,
      roles: user.value.roles.map((r) => r.role),
    })
  }
}

export const AuthGuardPlugin = new Elysia({
  name: 'AuthGuardPlugin',
})
  .use([AuthRepositoryPlugin, ConfigServicePlugin])
  .decorate(({ authRepository, configService }) => ({
    authGuard: new AuthGuard(authRepository, {
      oidcClientId: configService.get('OIDC_CLIENT_ID'),
      oidcUrl: configService.get('OIDC_URL'),
      oidcPrivateJwtKey: configService.get('OIDC_PRIVATE_JWT_KEY'),
      oidcKeyId: configService.get('OIDC_KEY_ID'),
    }),
  }))
  .macro({
    requiredOIDCUser: {
      async resolve({ headers, status, authGuard }) {
        const oidcUserResult = await authGuard.getOIDCUser(headers)

        if (oidcUserResult.isErr()) {
          return mapErrorCodeToResponse(oidcUserResult.error, status)
        }

        return { oidcUser: oidcUserResult.value }
      },
    },
    requiredLocalRole: (allowedRoles: string[]) => ({
      async resolve({ status, headers, authGuard }) {
        const hasAllowedRoles = await authGuard.checkUserHasRole(headers, allowedRoles)

        if (hasAllowedRoles.isErr()) {
          return mapErrorCodeToResponse(hasAllowedRoles.error, status)
        }

        if (!hasAllowedRoles.value.isAllowed) {
          return mapErrorCodeToResponse(
            { code: InternalErrorCode.FORBIDDEN, message: 'Forbidden' },
            status
          )
        }

        return { user: hasAllowedRoles.value.user }
      },
    }),
    fetchLocalUser: {
      async resolve({ headers, status, authGuard }) {
        const user = await authGuard.getCurrentUser(headers)

        if (user.isErr()) {
          if (user.error.code === InternalErrorCode.UNAUTHORIZED) return { user: null }
          return mapErrorCodeToResponse(user.error, status)
        }

        return { user: user.value }
      },
    },
    requiredLocalUser: {
      async resolve({ status, headers, authGuard }) {
        const user = await authGuard.getCurrentUser(headers)

        if (user.isErr()) {
          return mapErrorCodeToResponse(user.error, status)
        }

        return { user: user.value }
      },
    },
  })
  .as('scoped')
