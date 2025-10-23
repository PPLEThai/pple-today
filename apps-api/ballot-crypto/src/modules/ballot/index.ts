import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { BallotCountBody, BallotCountResponse } from './model'
import { BallotServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'

export const BallotController = new Elysia({
  prefix: '/ballots',
  tags: ['Ballots'],
})
  .use([AuthGuardPlugin, BallotServicePlugin])
  .post(
    '/count',
    async ({ body, ballotService, status }) => {
      const result = await ballotService.countBallots(body.electionId, body.ballots)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, {
        message: 'Start counting ballot',
      })
    },
    {
      detail: {
        summary: 'Count Ballots',
        description: 'Schedule counting encrypted ballots for election job',
      },
      validateBackoffice: true,
      body: BallotCountBody,
      response: {
        200: BallotCountResponse,
        ...createErrorSchema(
          InternalErrorCode.INTERNAL_SERVER_ERROR,
          InternalErrorCode.ELECTION_KEY_NOT_FOUND,
          InternalErrorCode.KEY_NOT_ENABLED
        ),
      },
    }
  )
