import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  AdminCancelElectionParams,
  AdminCancelElectionResponse,
  AdminGetElectionParams,
  AdminGetElectionResponse,
  AdminListElectionQuery,
  AdminListElectionResponse,
} from './models'
import { AdminElectionServicePlugin } from './services'

import { AuthGuardPlugin } from '../../../plugins/auth-guard'

export const AdminElectionController = new Elysia({
  prefix: '/elections',
  tags: ['Admin Elections'],
})
  .use(AuthGuardPlugin)
  .use(AdminElectionServicePlugin)
  .get(
    '/',
    async ({ query, status, adminElectionService }) => {
      const elections = await adminElectionService.listElections(query)
      if (elections.isErr()) {
        return mapErrorCodeToResponse(elections.error, status)
      }
      return status(200, elections.value)
    },
    {
      detail: {
        summary: 'List Elections',
        description: 'List Elections',
      },
      requiredLocalUser: true,
      query: AdminListElectionQuery,
      response: {
        200: AdminListElectionResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .get(
    '/:electionId',
    async ({ params, status, adminElectionService }) => {
      const result = await adminElectionService.getElection(params.electionId)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, result.value)
    },
    {
      detail: {
        summary: 'Get Election Detail',
        description: 'Get Election Detail',
      },
      requiredLocalUser: true,
      params: AdminGetElectionParams,
      response: {
        200: AdminGetElectionResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.ELECTION_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .put(
    '/:electionId/cancel',
    async ({ params, status, adminElectionService }) => {
      const result = await adminElectionService.cancelElection(params.electionId)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, {
        message: 'Cancel Election Successfully',
      })
    },
    {
      detail: {
        summary: 'Cancel Election',
        description: 'Cancel Election',
      },
      requiredLocalUser: true,
      params: AdminCancelElectionParams,
      response: {
        200: AdminCancelElectionResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.ELECTION_NOT_FOUND,
          InternalErrorCode.FILE_MOVE_ERROR,
          InternalErrorCode.FILE_ROLLBACK_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
