import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { GetElectionQuery, GetElectionResponse, ListElectionResponse } from './models'
import { ElectionServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'

export const ElectionController = new Elysia({
  prefix: '/elections',
  tags: ['Elections'],
})
  .use(AuthGuardPlugin)
  .use(ElectionServicePlugin)
  .get(
    '/',
    async ({ user, electionService, status }) => {
      const elections = await electionService.listMyEligibleElections(user.id)
      if (elections.isErr()) {
        return mapErrorCodeToResponse(elections.error, status)
      }

      return status(200, elections.value)
    },
    {
      detail: {
        summary: 'List elections based on user',
        description: 'List elections based on user',
      },
      requiredLocalUser: true,
      response: {
        200: ListElectionResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .get(
    '/:electionId',
    async ({ user, query: { electionId }, status, electionService }) => {
      const election = await electionService.getMyEligibleElection(user.id, electionId)
      if (election.isErr()) {
        return mapErrorCodeToResponse(election.error, status)
      }

      return status(200, election.value)
    },
    {
      detail: {
        summary: 'Get election by id based on user',
        description: 'Get election by id based on user',
      },
      requiredLocalUser: true,
      query: GetElectionQuery,
      response: {
        200: GetElectionResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.ELECTION_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
