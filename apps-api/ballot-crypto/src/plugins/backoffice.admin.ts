import { Treaty, treaty } from '@elysiajs/eden'
import { err } from '@pple-today/api-common/utils'
import { ElectionKeysStatus } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { AdminApiSchema } from '@api/backoffice/admin'

import { ConfigServicePlugin } from './config'

export class BackofficeAdminService {
  private readonly client: Treaty.Create<AdminApiSchema>

  constructor(private readonly config: { domain: string; ballotToBackofficeKey: string }) {
    this.client = treaty<AdminApiSchema>(config.domain)
  }

  async updateElectionKeys(data: {
    electionId: string
    status: ElectionKeysStatus
    encryptPublicKey?: string
    signingPublicKey?: string
  }) {
    const response = await this.client.admin.elections({ electionId: data.electionId }).keys.put(
      {
        status: data.status,
        encryptionPublicKey: data.encryptPublicKey,
        signingPublicKey: data.signingPublicKey,
      },
      {
        headers: {
          'x-ballot-crypto-to-backoffice-key': this.config.ballotToBackofficeKey,
        },
      }
    )

    if (response.status !== 204) {
      return err({
        code: (response.error?.value as any).code,
        message: (response.error?.value as any).message,
      })
    }

    return ok()
  }
}

export const BackofficeAdminServicePlugin = new Elysia({ name: 'BackofficeService' })
  .use(ConfigServicePlugin)
  .decorate(({ configService }) => ({
    backofficeService: new BackofficeAdminService({
      domain: configService.get('BACKOFFICE_DOMAIN'),
      ballotToBackofficeKey: configService.get('BALLOT_CRYPTO_TO_BACKOFFICE_KEY'),
    }),
  }))
