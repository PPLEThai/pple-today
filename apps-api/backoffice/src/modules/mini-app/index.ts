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
      // Users who are not logged in are not an error case here: they simply
      // see the mini apps that require no roles.
      const visibleRolesResult = await authGuard.getAdVisibleRoles(headers)

      let visibleRoles: string[]
      if (visibleRolesResult.isErr()) {
        if (visibleRolesResult.error.code !== InternalErrorCode.UNAUTHORIZED) {
          return mapErrorCodeToResponse(visibleRolesResult.error, status)
        }
        visibleRoles = []
      } else {
        visibleRoles = visibleRolesResult.value
      }

      const miniApps = await miniAppService.listMiniApps(visibleRoles)

      if (miniApps.isErr()) {
        return mapErrorCodeToResponse(miniApps.error, status)
      }

      return status(200, miniApps.value)
    },
    {
      detail: {
        summary: 'List Mini Apps',
        description:
          'Retrieve the list of mini apps. Anonymous users see only mini apps with no required roles.',
      },
      query: ListMiniAppsQuery,
      response: {
        200: ListMiniAppsResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
