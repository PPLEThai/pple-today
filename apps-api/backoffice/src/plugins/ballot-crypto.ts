import { Treaty, treaty } from '@elysiajs/eden'
import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { ApplicationApiSchema } from '@api/ballot-crypto/app'

import { ConfigServicePlugin } from './config'

export class BallotCryptoService {
  private client: Treaty.Create<ApplicationApiSchema>

  constructor(config: { domain: string }) {
    this.client = treaty<ApplicationApiSchema>(config.domain)
  }

  async createElectionKeys(electionId: string) {
    const response = await this.client.keys.post({
      electionId,
    })

    if (response.status !== 201) {
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
      })
    }

    return ok()
  }

  async destroyElectionKeys(electionId: string) {
    const response = await this.client.keys({ electionId }).delete()

    if (response.status !== 204) {
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
      })
    }

    return ok()
  }
}

export const BallotCryptoServicePlugin = new Elysia()
  .use([ConfigServicePlugin])
  .decorate(({ configService }) => ({
    ballotCryptoService: new BallotCryptoService({
      domain: configService.get('BALLOT_CRYPTO_DOMAIN'),
    }),
  }))
