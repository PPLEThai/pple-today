import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { ListElectionResponse } from './models'
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
