import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err, fromRepositoryPromise, mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { KeyManagementPlugin, KeyManagementService } from '../../plugins/kms'

export class KeyService {
  constructor(private keyManagementService: KeyManagementService) {}

  async createElectionEncryptionKey(electionId: string) {
    const createKeyResult = await fromRepositoryPromise(
      this.keyManagementService.createKey(electionId)
    )
    if (createKeyResult.isErr()) {
      return err({
        code: InternalErrorCode.KEY_ALREADY_EXIST,
        message: 'Key Already exist',
      })
    }
    const publicKeyResult = await this.keyManagementService.getPublicKey(electionId)
    if (publicKeyResult.isErr()) return mapRepositoryError(publicKeyResult.error)
    return ok({
      publicKey: publicKeyResult.value,
    })
  }
}

export const KeyServicePlugin = new Elysia({ name: 'KeyService' })
  .use(KeyManagementPlugin)
  .decorate(({ keyManagementService }) => ({
    keyService: new KeyService(keyManagementService),
  }))
