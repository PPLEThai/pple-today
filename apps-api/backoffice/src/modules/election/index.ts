import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  GetElectionParams,
  GetElectionResponse,
  ListElectionResponse,
  RegisterElectionBody,
  RegisterElectionParams,
  RegisterElectionResponse,
} from './models'
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
    async ({ user, params: { electionId }, status, electionService }) => {
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
      params: GetElectionParams,
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
  .post(
    '/:electionId/register',
    async ({ user, params, body, electionService, status }) => {
      const registerElection = await electionService.registerEleciton(
        user.id,
        params.electionId,
        body.type
      )
      if (registerElection.isErr()) {
        return mapErrorCodeToResponse(registerElection.error, status)
      }

      return {
        message: 'Register election success',
      }
    },
    {
      detail: {
        summary: 'Register hybrid election',
        description: 'Can choose to vote either ONLINE or ONSITE.',
      },
      requiredLocalUser: true,
      params: RegisterElectionParams,
      body: RegisterElectionBody,
      response: {
        200: RegisterElectionResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.ELECTION_NOT_FOUND,
          InternalErrorCode.ELECTION_NOT_IN_REGISTER_PERIOD,
          InternalErrorCode.ELECTION_REGISTER_TO_INVALID_TYPE,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
