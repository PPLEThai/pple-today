import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { ListMiniAppsResponse } from './models'
import { MiniAppServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'

export const MiniAppController = new Elysia({ prefix: '/mini-app', tags: ['Mini Apps'] })
  .use([AuthGuardPlugin, MiniAppServicePlugin])
  .get(
    '/',
    async ({ status, miniAppService, user }) => {
      const miniApps = await miniAppService.listMiniApps(user.roles)

      if (miniApps.isErr()) {
        return mapErrorCodeToResponse(miniApps.error, status)
      }

      return status(200, miniApps.value)
    },
    {
      requiredLocalUser: true,
      detail: {
        summary: 'List Mini Apps',
        description: 'Retrieve the list of mini apps',
      },
      response: {
        200: ListMiniAppsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
