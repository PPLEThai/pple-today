import { err } from '@pple-today/api-common/utils'
import { ElectionOnlineResultStatus } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'
import stringify from 'safe-stable-stringify'

import {
  BackofficeAdminService,
  BackofficeAdminServicePlugin,
} from '../../plugins/backoffice.admin'
import { KeyManagementPlugin, KeyManagementService } from '../../plugins/kms'

export class BallotService {
  private BATCH_SIZE = 10

  constructor(
    private readonly keyManagementService: KeyManagementService,
    private readonly backofficeAdminService: BackofficeAdminService
  ) {}

  async countBallots(electionId: string, ballots: string[]) {
    const checkResult = await this.keyManagementService.checkIfKeysValid(electionId)
    if (checkResult.isErr()) {
      return err(checkResult.error)
    }

    setImmediate(() => this.updateElectionResult(electionId, ballots))

    return ok()
  }

  private async updateElectionResult(electionId: string, ballots: string[]) {
    const counter = new Map<string, number>()

    for (let i = 0; i < ballots.length; i += this.BATCH_SIZE) {
      const endIdx = Math.min(ballots.length, i + this.BATCH_SIZE)
      const batch = ballots.slice(i, endIdx)

      const decryptResults = await Promise.all(
        batch.map((ballot) => this.keyManagementService.decryptCiphertext(electionId, ballot))
      )

      const decryptResultErr = decryptResults.find((result) => result.isErr())
      if (decryptResultErr) {
        await this.backofficeAdminService.updateElectionResult({
          electionId,
          status: ElectionOnlineResultStatus.COUNT_FAILED,
        })
        return
      }

      decryptResults
        .filter((result) => result.isOk())
        .map((result) => result.value)
        .forEach((ballot) => {
          const { candidateId } = JSON.parse(ballot)
          counter.set(candidateId, (counter.get(candidateId) || 0) + 1)
        })
    }

    const result: { candidateId: string; votes: number }[] = []
    counter.forEach((votes, candidateId) => {
      result.push({
        candidateId,
        votes,
      })
    })

    const signatureResult = await this.keyManagementService.createSignature(
      electionId,
      stringify(result)
    )
    if (signatureResult.isErr()) {
      await this.backofficeAdminService.updateElectionResult({
        electionId,
        status: ElectionOnlineResultStatus.COUNT_FAILED,
      })
      return
    }

    await this.backofficeAdminService.updateElectionResult({
      electionId,
      status: ElectionOnlineResultStatus.COUNT_SUCCESS,
      signature: signatureResult.value,
      result,
    })
  }
}

export const BallotServicePlugin = new Elysia({ name: 'BallotService' })
  .use([KeyManagementPlugin, BackofficeAdminServicePlugin])
  .decorate(({ keyManagementService, backofficeService }) => ({
    ballotService: new BallotService(keyManagementService, backofficeService),
  }))
