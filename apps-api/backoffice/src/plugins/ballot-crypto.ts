import { Treaty, treaty } from '@elysiajs/eden'
import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { ApplicationApiSchema } from '@api/ballot-crypto/app'

import { ConfigServicePlugin } from './config'

export class BallotCryptoService {
  private readonly client: Treaty.Create<ApplicationApiSchema>

  constructor(private readonly config: { domain: string; apiKey: string }) {
    this.client = treaty<ApplicationApiSchema>(config.domain, {
      headers: {
        'x-backoffice-to-ballot-crypto-key': this.config.apiKey,
      },
    })
  }

  async createElectionKeys(electionId: string) {
    const response = await this.client.keys.post({ electionId })

    if (response.status < 200 || response.status >= 300) {
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
      })
    }

    return ok()
  }

  async getElectionKeys(electionId: string) {
    const response = await this.client.keys({ electionId }).get()

    if (response.status < 200 || response.status >= 300) {
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
      })
    }

    return ok(response.data)
  }

  async destroyElectionKeys(electionId: string) {
    const response = await this.client.keys({ electionId }).delete()

    if (response.status < 200 || response.status >= 300) {
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
      })
    }

    return ok(response.data)
  }

  async countBallots(electionId: string, ballots: string[]) {
    const response = await this.client.ballots.count.post({
      electionId,
      ballots,
    })

    if (response.status < 200 || response.status >= 300) {
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An unexpected error occurred',
      })
    }

    return ok()
  }

  async restoreKeys(electionId: string) {
    const response = await this.client.keys({ electionId }).restore.put({})

    if (response.status < 200 || response.status >= 300) {
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
      apiKey: configService.get('BACKOFFICE_TO_BALLOT_CRYPTO_KEY'),
      domain: configService.get('BALLOT_CRYPTO_DOMAIN'),
    }),
  }))
