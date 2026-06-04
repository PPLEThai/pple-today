import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { ListMiniAppsQuery, ListMiniAppsResponse } from './models'
import { MiniAppServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'

export const MiniAppController = new Elysia({ prefix: '/mini-app', tags: ['Mini Apps'] })
  .use([AuthGuardPlugin, MiniAppServicePlugin])
  .get(
    '/',
    async ({ status, miniAppService, headers, authGuard }) => {
      // Resolve the visible roles from the user's active role in SSO AD
      // (main role + extra roles). The legacy `role` query param is accepted
      // for backward compatibility with older app versions but ignored.
      const visibleRoles = await authGuard.getAdVisibleRoles(headers)

      if (visibleRoles.isErr()) {
        return mapErrorCodeToResponse(visibleRoles.error, status)
      }

      const miniApps = await miniAppService.listMiniApps(visibleRoles.value)

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
      query: ListMiniAppsQuery,
      response: {
        200: ListMiniAppsResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
