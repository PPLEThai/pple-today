import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err, mapErrorCodeToResponse, mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { ConfigServicePlugin } from './config'

import { isCmsAdmin } from '../constants/roles'
import { AdminAuthRepository, AdminAuthRepositoryPlugin } from '../modules/admin/auth/repository'
import { introspectAccessToken } from '../utils/jwt'
import { setUserIdHeader } from '../utils/request'
import { fetchAdVisibleRoles } from '../utils/sso-ad'

export class AdminAuthGuard {
  constructor(
    private readonly adminAuthRepository: AdminAuthRepository,
    private readonly oidcConfig: {
      oidcClientId: string
      oidcUrl: string
      oidcPrivateJwtKey: string
      oidcKeyId: string
    },
    private readonly ballotCryptoToBackofficeKey: string
  ) {}

  async getOIDCUser(headers: Record<string, string | undefined>) {
    const token = headers['authorization']?.replace('Bearer', '').trim()
    if (!token)
      return err({ code: InternalErrorCode.UNAUTHORIZED, message: 'User not authenticated' })

    // Identity and authorisation are two different SSO reads, taken in parallel
    // over the same token: introspection says who this is, AD userinfo says
    // which บทบาท they are currently wearing. Only the AD side decides admin
    // access — the token's `pple_roles` are a Zitadel mirror that does not
    // follow a role switch.
    const [introspectionResult, visibleRolesResult] = await Promise.all([
      introspectAccessToken(token, this.oidcConfig),
      fetchAdVisibleRoles(headers, this.oidcConfig.oidcUrl),
    ])

    if (introspectionResult.isErr()) return err(introspectionResult.error)
    if (visibleRolesResult.isErr()) return err(visibleRolesResult.error)

    if (!isCmsAdmin(visibleRolesResult.value)) {
      return err({
        code: InternalErrorCode.FORBIDDEN,
        message: 'Required admin role to access this resource',
      })
    }

    return ok(introspectionResult.value)
  }

  async getCurrentUser(headers: Record<string, string | undefined>) {
    const oidcUserResult = await this.getOIDCUser(headers)
    if (oidcUserResult.isErr()) return err(oidcUserResult.error)

    const oidcUser = oidcUserResult.value
    if (!oidcUser)
      return err({ code: InternalErrorCode.UNAUTHORIZED, message: 'User not authenticated' })

    const user = await this.adminAuthRepository.getUserById(oidcUser.sub)

    if (user.isErr()) {
      if (user.error.code === 'RECORD_NOT_FOUND') {
        const registerUserResult = await this.adminAuthRepository.registerUser({
          id: oidcUser.sub,
          name: oidcUser.name,
        })

        if (registerUserResult.isErr()) return mapRepositoryError(registerUserResult.error)

        return ok({
          id: registerUserResult.value.id,
          name: registerUserResult.value.name,
        })
      }

      return mapRepositoryError(user.error)
    }

    return ok({
      id: oidcUser.sub,
      name: oidcUser.name,
    })
  }

  validateBallotCrypto(key: string) {
    if (key !== this.ballotCryptoToBackofficeKey) {
      return err({
        code: InternalErrorCode.UNAUTHORIZED,
        message: 'Not authenticated',
      })
    }
    return ok()
  }
}

export const AdminAuthGuardPlugin = new Elysia({
  name: 'AdminAuthGuardPlugin',
})
  .use([AdminAuthRepositoryPlugin, ConfigServicePlugin])
  .decorate(({ adminAuthRepository, configService }) => ({
    adminAuthGuard: new AdminAuthGuard(
      adminAuthRepository,
      {
        oidcClientId: configService.get('OIDC_CLIENT_ID'),
        oidcUrl: configService.get('OIDC_URL'),
        oidcPrivateJwtKey: configService.get('OIDC_PRIVATE_JWT_KEY'),
        oidcKeyId: configService.get('OIDC_KEY_ID'),
      },
      configService.get('BALLOT_CRYPTO_TO_BACKOFFICE_KEY')
    ),
  }))
  .macro({
    requiredLocalUser: {
      async resolve({ status, headers, adminAuthGuard, request }) {
        const user = await adminAuthGuard.getCurrentUser(headers)

        if (user.isErr()) {
          return mapErrorCodeToResponse(user.error, status)
        }

        setUserIdHeader(request, user.value.id)

        return { user: user.value }
      },
    },
    validateBallotCrypto: {
      async resolve({ status, headers, adminAuthGuard }) {
        const result = adminAuthGuard.validateBallotCrypto(
          headers['x-ballot-crypto-to-backoffice-key'] || ''
        )

        if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

        return {}
      },
    },
  })
  .as('scoped')
