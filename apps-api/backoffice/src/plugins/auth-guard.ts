import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err, mapErrorCodeToResponse, mapRepositoryError } from '@pple-today/api-common/utils'
import { UserStatus } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'
import * as R from 'remeda'

import { ConfigServicePlugin } from './config'

import { AD_ROLE_PREFIX } from '../constants/roles'
import { AuthRepository, AuthRepositoryPlugin } from '../modules/auth/repository'
import { introspectAccessToken } from '../utils/jwt'
import { fetchAdUserInfo, resolveVisibleRoles } from '../utils/sso-ad'

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

    const user = await introspectAccessToken(token, this.oidcConfig)

    if (user.isErr()) return err(user.error)

    return ok({
      ...user.value,
      access_token: token,
    })
  }

  async getAdVisibleRoles(headers: Record<string, string | undefined>) {
    const token = headers['authorization']?.replace('Bearer', '').trim()
    if (!token)
      return err({ code: InternalErrorCode.UNAUTHORIZED, message: 'User not authenticated' })

    const userInfo = await fetchAdUserInfo(token, this.oidcConfig.oidcUrl)
    if (userInfo.isErr()) return err(userInfo.error)

    return ok(resolveVisibleRoles(userInfo.value))
  }

  async checkUserPrecondition(
    headers: Record<string, string | undefined>,
    conditions: { allowedRoles?: string[]; isActive?: boolean }
  ) {
    const user = await this.getCurrentUser(headers)

    if (user.isErr()) return mapRepositoryError(user.error)

    if (conditions.allowedRoles) {
      // `pple-ad:`-prefixed roles are resolved live from the SSO AD active role
      // (main + extra roles); other roles fall back to the OIDC token roles.
      let roles = user.value.roles
      if (conditions.allowedRoles.some((role) => role.startsWith(AD_ROLE_PREFIX))) {
        const adRoles = await this.getAdVisibleRoles(headers)
        if (adRoles.isErr()) return err(adRoles.error)
        roles = adRoles.value
      }

      const intersectionRoles = R.intersection(roles, conditions.allowedRoles)
      if (intersectionRoles.length === 0) {
        return err({
          code: InternalErrorCode.FORBIDDEN,
          message: 'You are not allowed to perform this action',
        })
      }
    }

    if (conditions.isActive) {
      if (user.value.status !== UserStatus.ACTIVE) {
        return err({
          code: InternalErrorCode.FORBIDDEN,
          message: 'You are not allowed to perform this action',
        })
      }
    }

    return ok(user.value)
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
      accessToken: oidcUser.access_token,
      roles: oidcUserResult.value.pple_roles,
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
    requiredLocalUserPrecondition: (conditions: {
      allowedRoles?: string[]
      isActive?: boolean
    }) => ({
      async resolve({ status, headers, authGuard }) {
        const checkResult = await authGuard.checkUserPrecondition(headers, conditions)

        if (checkResult.isErr()) {
          return mapErrorCodeToResponse(checkResult.error, status)
        }

        return { user: checkResult.value }
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
