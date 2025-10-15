import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { ConfigServicePlugin } from './config'

export class AuthGuard {
  constructor(private readonly backofficeToBallotCryptoKey: string) {}

  validateBackoffice(key: string) {
    if (key !== this.backofficeToBallotCryptoKey) {
      return err({
        code: InternalErrorCode.UNAUTHORIZED,
        message: 'Not authenticated',
      })
    }
    return ok()
  }
}

export const AuthGuardPlugin = new Elysia({
  name: 'AuthGuardPlugin',
})
  .use([ConfigServicePlugin])
  .decorate(({ configService }) => ({
    authGuard: new AuthGuard(configService.get('BACKOFFICE_TO_BALLOT_CRYPTO_KEY')),
  }))
  .macro({
    validateBackoffice: {
      async resolve({ status, headers, authGuard }) {
        const result = authGuard.validateBackoffice(
          headers['x-backoffice-to-ballot-crypto-key'] || ''
        )

        if (result.isErr()) {
          return mapErrorCodeToResponse(result.error, status)
        }

        return {}
      },
    },
  })
  .as('scoped')
