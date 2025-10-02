import { InternalErrorCode } from '@pple-today/api-common/dtos'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { KeyManagementPlugin, KeyManagementService } from '../../plugins/kms'
import { mapGoogleAPIError } from '../../utils/error'

export class KeyService {
  constructor(private keyManagementService: KeyManagementService) {}

  async createElectionKeys(electionId: string) {
    const createKeyResults = await Promise.all([
      this.keyManagementService.createKeyAsymmetricDecrypt(electionId),
      this.keyManagementService.createKeyAsymmetricSign(electionId),
    ])
    const createKeyErrors = createKeyResults.filter((result) => result.isErr())
    if (createKeyErrors.length !== 0) {
      return mapGoogleAPIError(createKeyErrors[0].error, {
        ALREADY_EXISTS: {
          code: InternalErrorCode.KEY_ALREADY_EXIST,
          message: 'Key for this election exist',
        },
      })
    }

    const publicKeyResults = await Promise.all([
      this.keyManagementService.getPublicKeyAsymmetricDecrypt(electionId),
      this.keyManagementService.getPublicKeyAsymmetricSign(electionId),
    ])
    const publicKeyErrors = publicKeyResults.filter((result) => result.isErr())
    if (publicKeyErrors.length === 0) {
      const destroyKeyResults = await Promise.all([
        this.keyManagementService.destroyKeyAsymmetricDecrypt(electionId),
        this.keyManagementService.destroyKeyAsymmetricSign(electionId),
      ])
      const destroyKeyErrors = destroyKeyResults.filter((result) => result.isErr())
      if (destroyKeyErrors.length !== 0) return mapGoogleAPIError(destroyKeyErrors[0].error)

      return mapGoogleAPIError(publicKeyErrors[0].error)
    }

    const publicKeyOks = publicKeyResults.filter((result) => result.isOk())

    return ok({
      encryptionPublicKey: publicKeyOks[0].value,
      signingPublicKey: publicKeyOks[1].value,
    })
  }
}

export const KeyServicePlugin = new Elysia({ name: 'KeyService' })
  .use(KeyManagementPlugin)
  .decorate(({ keyManagementService }) => ({
    keyService: new KeyService(keyManagementService),
  }))
