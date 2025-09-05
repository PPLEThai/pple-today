import Elysia from 'elysia'

import { ListElectionResponse } from './models'

import { InternalErrorCode } from '../../dtos/error'
import { AuthGuardPlugin } from '../../plugins/auth-guard'
import { createErrorSchema } from '../../utils/error'

export const ElectionController = new Elysia({
  prefix: '/elections',
  tags: ['Elections'],
})
  .use(AuthGuardPlugin)
  .get('/', [], {
    detail: {
      summary: 'list elections based on user',
      description: 'list elections based on user',
    },
    requiredLocalUser: true,
    response: {
      200: ListElectionResponse,
      ...createErrorSchema(InternalErrorCode.UNAUTHORIZED, InternalErrorCode.INTERNAL_SERVER_ERROR),
    },
  })
