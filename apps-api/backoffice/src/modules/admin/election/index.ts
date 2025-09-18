import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import { UserRole } from '@pple-today/database/prisma'
import Elysia from 'elysia'

import {
  AdminGetElectionParams,
  AdminGetElectionResponse,
  AdminListElectionQuery,
  AdminListElectionResponse,
  AdminUpdateElectionBody,
  AdminUpdateElectionParams,
  AdminUpdateElectionResponse,
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
      requiredLocalRole: [UserRole.OFFICIAL],
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
      requiredLocalRole: [UserRole.OFFICIAL],
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
    '/:electionId',
    async ({ params, body, status, adminElectionService }) => {
      const result = await adminElectionService.updateElection(params.electionId, body)
      if (result.isErr()) return mapErrorCodeToResponse(result.error, status)

      return status(200, {
        message: 'Update Election Successfully',
      })
    },
    {
      detail: {
        summary: 'Update Election',
        description: 'Update Election',
      },
      requiredLocalRole: [UserRole.OFFICIAL],
      params: AdminUpdateElectionParams,
      body: AdminUpdateElectionBody,
      response: {
        200: AdminUpdateElectionResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.FORBIDDEN,
          InternalErrorCode.ELECTION_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
