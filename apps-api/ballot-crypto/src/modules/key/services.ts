import { InternalErrorCode } from '@pple-today/api-common/dtos'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { KeyManagementPlugin, KeyManagementService } from '../../plugins/kms'
import { mapGoogleAPIError } from '../../utils/error'

export class KeyService {
  constructor(private keyManagementService: KeyManagementService) {}

  async createElectionKeys(electionId: string) {
    const createResults = await Promise.all([
      this.keyManagementService.createAsymmetricDecryptKey(electionId),
      this.keyManagementService.createAsymmetricSignKey(electionId),
    ])

    const createErr = createResults.find((result) => result.isErr())

    if (createErr) {
      const [decryptResult, signResult] = createResults

      if (decryptResult.isOk()) {
        const deleteResult = await this.keyManagementService.destroyAsymmetricDecryptKey(electionId)
        if (deleteResult.isErr()) return mapGoogleAPIError(deleteResult.error)
      }

      if (signResult.isOk()) {
        const deleteResult = await this.keyManagementService.destroyAsymmetricSignKey(electionId)
        if (deleteResult.isErr()) return mapGoogleAPIError(deleteResult.error)
      }

      return mapGoogleAPIError(createErr.error, {
        ALREADY_EXISTS: {
          code: InternalErrorCode.KEY_ALREADY_EXIST,
          message: 'Key for this election exist',
        },
      })
    }

    return ok()
  }

  async destroyElectionKeys(electionId: string) {
    const destroyKeyResults = await Promise.all([
      this.keyManagementService.destroyAsymmetricDecryptKey(electionId),
      this.keyManagementService.destroyAsymmetricSignKey(electionId),
    ])

    const destroyKeyErr = destroyKeyResults.find((result) => result.isErr())
    if (destroyKeyErr) {
      return mapGoogleAPIError(destroyKeyErr.error, {
        NOT_FOUND: {
          code: InternalErrorCode.KET_NOT_FOUND,
          message: 'Key for this election not found',
        },
      })
    }

    return ok()
  }
}

export const KeyServicePlugin = new Elysia({ name: 'KeyService' })
  .use(KeyManagementPlugin)
  .decorate(({ keyManagementService }) => ({
    keyService: new KeyService(keyManagementService),
  }))
