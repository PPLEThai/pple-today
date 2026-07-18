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
      // Resolve, in parallel over the same bearer token, the two independent SSO
      // reads this listing needs: the AD visible roles (main + extra roles) and
      // the user's `sub`. The legacy `role` query param is accepted for backward
      // compatibility with older app versions but ignored. Users who are not
      // logged in are not an error case here: they simply see the mini apps that
      // require no roles.
      const [visibleRolesResult, oidcUserResult] = await Promise.all([
        authGuard.getAdVisibleRoles(headers),
        authGuard.getOIDCUser(headers),
      ])

      let visibleRoles: string[]
      if (visibleRolesResult.isErr()) {
        if (visibleRolesResult.error.code !== InternalErrorCode.UNAUTHORIZED) {
          return mapErrorCodeToResponse(visibleRolesResult.error, status)
        }
        visibleRoles = []
      } else {
        visibleRoles = visibleRolesResult.value
      }

      // The `sub` gates owner-only (DRAFT/BETA) apps. It is a soft signal:
      // anonymous users (and any token we cannot resolve to a sub) simply see no
      // owner-only apps. A genuine SSO outage already surfaces as a 500 from the
      // role resolution above, so degrading to null here only affects the
      // handful of Draft/Beta rows, never the public/role listing.
      const userSub = oidcUserResult.isOk() ? oidcUserResult.value.sub : null

      const miniApps = await miniAppService.listMiniApps(visibleRoles, userSub)

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
