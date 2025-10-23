import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err } from '@pple-today/api-common/utils'
import { ElectionKeysStatus, ElectionOnlineResultStatus } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { ConfigServicePlugin } from './config'

export class BackofficeAdminService {
  constructor(private readonly config: { url: string; apiKey: string }) {}

  private getUrl(path: string) {
    return `${this.config.url}${path}`
  }

  async updateElectionKeys(data: {
    electionId: string
    status: ElectionKeysStatus
    encryptPublicKey?: string
    signingPublicKey?: string
  }) {
    const res = await fetch(this.getUrl(`/admin/elections/${data.electionId}/keys`), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-ballot-crypto-to-backoffice-key': this.config.apiKey,
      },
      body: JSON.stringify({
        status: data.status,
        encryptionPublicKey: data.encryptPublicKey,
        signingPublicKey: data.signingPublicKey,
      }),
    })

    if (!res.ok) {
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Unexpected error occured',
      })
    }

    return ok()
  }

  async updateElectionResult(data: {
    electionId: string
    status: ElectionOnlineResultStatus
    signature?: string
    result?: { candidateId: string; votes: number }[]
  }) {
    const response = await fetch(this.getUrl(`/admin/elections/${data.electionId}/result/online`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ballot-crypto-to-backoffice-key': this.config.apiKey,
      },
      body: JSON.stringify({
        status: data.status,
        signature: data.signature,
        result: data.result,
      }),
    })

    if (!response.ok) {
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Unexpected error occured',
      })
    }

    return ok()
  }
}

export const BackofficeAdminServicePlugin = new Elysia({ name: 'BackofficeService' })
  .use(ConfigServicePlugin)
  .decorate(({ configService }) => ({
    backofficeService: new BackofficeAdminService({
      url: configService.get('BACKOFFICE_URL'),
      apiKey: configService.get('BALLOT_CRYPTO_TO_BACKOFFICE_KEY'),
    }),
  }))
