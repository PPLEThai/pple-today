import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err } from '@pple-today/api-common/utils'
import { ElectionKeysStatus } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import {
  BackofficeAdminService,
  BackofficeAdminServicePlugin,
} from '../../plugins/backoffice.admin'
import { KeyManagementPlugin, KeyManagementService } from '../../plugins/kms'
import { mapGoogleAPIError } from '../../utils/error'

export class KeyService {
  private readonly MAX_RETRY = 10
  private readonly DELAY = 1

  constructor(
    private readonly keyManagementService: KeyManagementService,
    private readonly backofficeAdminService: BackofficeAdminService
  ) {}

  async createElectionKeys(electionId: string) {
    const createResults = await Promise.all([
      this.keyManagementService.createAsymmetricEncryptKey(electionId),
      this.keyManagementService.createAsymmetricSignKey(electionId),
    ])

    const createErr = createResults.find((result) => result.isErr())

    if (createErr) {
      const [decryptResult, signResult] = createResults

      if (decryptResult.isOk()) {
        const deleteResult = await this.keyManagementService.destroyAsymmetricEncryptKey(electionId)
        if (deleteResult.isErr()) return mapGoogleAPIError(deleteResult.error)
      }

      if (signResult.isOk()) {
        const deleteResult = await this.keyManagementService.destroyAsymmetricSignKey(electionId)
        if (deleteResult.isErr()) return mapGoogleAPIError(deleteResult.error)
      }

      return mapGoogleAPIError(createErr.error, {
        ALREADY_EXISTS: {
          code: InternalErrorCode.ELECTION_KEY_ALREADY_EXIST,
          message: 'Key for this election exist',
        },
      })
    }

    setImmediate(() => this.updateElectionKeys(electionId))

    return ok()
  }

  async getElectionKeys(electionId: string) {
    const results = await Promise.all([
      this.keyManagementService.getPublicKeyAsymmetricEncrypt(electionId),
      this.keyManagementService.getPublicKeyAsymmetricSign(electionId),
    ])

    const err = results.find((result) => result.isErr())

    if (err) return mapGoogleAPIError(err.error)

    const [encryptResult, signingResult] = results.filter((result) => result.isOk())

    return ok({
      publicEncrypt: encryptResult.value,
      publicSigning: signingResult.value,
    })
  }

  async destroyElectionKeys(electionId: string) {
    const destroyKeyResults = await Promise.all([
      this.keyManagementService.destroyAsymmetricEncryptKey(electionId),
      this.keyManagementService.destroyAsymmetricSignKey(electionId),
    ])

    const destroyKeyErr = destroyKeyResults.find((result) => result.isErr())
    if (destroyKeyErr) {
      return mapGoogleAPIError(destroyKeyErr.error, {
        NOT_FOUND: {
          code: InternalErrorCode.ELECTION_KEY_NOT_FOUND,
          message: 'Key for this election not found',
        },
      })
    }

    const destoryOk = destroyKeyResults.find((result) => result.isOk())

    return ok({ destroyScheduledDuration: destoryOk?.value })
  }

  async updateElectionKeys(electionId: string) {
    for (let i = 0; i < this.MAX_RETRY; i++) {
      const [encryptResult, signingResult] = await Promise.all([
        this.keyManagementService.getPublicKeyAsymmetricEncrypt(electionId),
        this.keyManagementService.getPublicKeyAsymmetricSign(electionId),
      ])

      if (encryptResult.isOk() && signingResult.isOk()) {
        const result = await this.backofficeAdminService.updateElectionKeys({
          electionId,
          status: ElectionKeysStatus.CREATED,
          encryptPublicKey: encryptResult.value,
          signingPublicKey: signingResult.value,
        })
        if (result.isErr()) break

        return ok()
      }

      await new Promise((resolve) => setTimeout(resolve, this.DELAY * 1000))
    }

    await Promise.all([
      this.keyManagementService.destroyAsymmetricEncryptKey(electionId),
      this.keyManagementService.destroyAsymmetricSignKey(electionId),
      this.backofficeAdminService.updateElectionKeys({
        electionId,
        status: ElectionKeysStatus.FAILED_CREATED,
      }),
    ])

    return ok()
  }

  async restoreElectionKeys(electionId: string) {
    const checkResult = await this.keyManagementService.checkIfKeysValid(electionId)
    if (checkResult.isOk()) return ok()

    const restoreResults = await Promise.all([
      this.keyManagementService.restoreAsymmetricSigningKey(electionId),
      this.keyManagementService.restoreAsymmetricEncryptKey(electionId),
    ])

    const restoreErr = restoreResults.find((result) => result.isErr())

    if (restoreErr) {
      const [encryptResult, signingResult] = restoreResults

      if (encryptResult.isOk()) {
        const destroyResult =
          await this.keyManagementService.destroyAsymmetricEncryptKey(electionId)
        if (destroyResult.isErr()) return err(destroyResult.error)
      }

      if (signingResult.isOk()) {
        const destroyResult = await this.keyManagementService.destroyAsymmetricSignKey(electionId)
        if (destroyResult.isErr()) return err(destroyResult.error)
      }

      return mapGoogleAPIError(restoreErr.error, {
        NOT_FOUND: {
          code: InternalErrorCode.ELECTION_KEY_NOT_FOUND,
          message: `Cannot found key id ${electionId}`,
        },
      })
    }

    return ok()
  }
}

export const KeyServicePlugin = new Elysia({ name: 'KeyService' })
  .use([KeyManagementPlugin, BackofficeAdminServicePlugin])
  .decorate(({ keyManagementService, backofficeService }) => ({
    keyService: new KeyService(keyManagementService, backofficeService),
  }))
