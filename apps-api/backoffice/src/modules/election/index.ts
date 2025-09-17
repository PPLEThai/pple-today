import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  CreateBallotBody,
  CreateBallotParams,
  CreateBallotResponse,
  GetElectionParams,
  GetElectionResponse,
  ListElectionResponse,
  RegisterElectionBody,
  RegisterElectionParams,
  RegisterElectionResponse,
  WithdrawBallotParams,
  WithdrawBallotResponse,
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

      return status(200, {
        message: 'Register election success',
      })
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
  .post(
    '/:electionId/ballot',
    async ({ params, body, user, status, electionService }) => {
      const createBallot = await electionService.createBallot(
        user.id,
        params.electionId,
        body.encryptedBallot,
        body.faceImage,
        body.location
      )
      if (createBallot.isErr()) {
        return mapErrorCodeToResponse(createBallot.error, status)
      }

      return status(200, {
        message: 'Create Ballot success',
      })
    },
    {
      detail: {
        summary: 'Create ballot',
        description: 'Create ballot',
      },
      requiredLocalUser: true,
      params: CreateBallotParams,
      body: CreateBallotBody,
      response: {
        200: CreateBallotResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.ELECTION_NOT_FOUND,
          InternalErrorCode.ELECTION_VOTE_TO_INVALID_TYPE,
          InternalErrorCode.ELECTION_NOT_IN_VOTE_PERIOD,
          InternalErrorCode.ELECTION_USER_ALREADY_VOTE,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .delete(
    '/:electionId/ballot',
    async ({ user, params, status, electionService }) => {
      const withdrawBallot = await electionService.withdrawBallot(user.id, params.electionId)
      if (withdrawBallot.isErr()) {
        return mapErrorCodeToResponse(withdrawBallot.error, status)
      }

      return status(200, {
        message: 'Withdraw ballot success',
      })
    },
    {
      detail: {
        summary: 'Withdraw ballot',
        description: 'Withdraw ballot',
      },
      requiredLocalUser: true,
      params: WithdrawBallotParams,
      response: {
        200: WithdrawBallotResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.ELECTION_NOT_FOUND,
          InternalErrorCode.ELECTION_WITHDRAW_TO_INVALID_TYPE,
          InternalErrorCode.ELECTION_NOT_IN_VOTE_PERIOD,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
