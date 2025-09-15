import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import { UserRole } from '@pple-today/database/prisma'
import Elysia from 'elysia'

import { AdminListElectionQuery, AdminListElectionResponse } from './models'
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
