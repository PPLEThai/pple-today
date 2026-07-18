import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { PlatformAuthGuard } from './guard'
import { GetMiniAppUserCountParams, GetMiniAppUserCountResponse } from './models'

import { ConfigServicePlugin } from '../../plugins/config'
import { AppUserServicePlugin } from '../mini-app/services'

const PlatformAuthGuardPlugin = new Elysia({ name: 'PlatformAuthGuardPlugin' })
  .use([ConfigServicePlugin])
  .decorate(({ configService }) => ({
    platformAuthGuard: new PlatformAuthGuard(configService.get('PLATFORM_SERVICE_TOKEN')),
  }))
  .macro({
    requiredPlatformService: {
      async resolve({ status, headers, platformAuthGuard }) {
        const result = platformAuthGuard.authenticate(headers)

        if (result.isErr()) {
          return mapErrorCodeToResponse(result.error, status)
        }

        return {}
      },
    },
  })
  .as('scoped')

/**
 * Service-to-service API consumed by the pple-platform provisioner. Every route
 * is gated by the dedicated platform service token (see `PlatformAuthGuard`),
 * separate from admin/user auth. This module starts with the App User count;
 * the fuller platform surface (create/tier/invites/notifications) lands later.
 */
export const PlatformController = new Elysia({ prefix: '/platform', tags: ['Platform'] })
  .use([PlatformAuthGuardPlugin, AppUserServicePlugin])
  .get(
    '/mini-apps/:id/user-count',
    async ({ params, status, appUserService }) => {
      const result = await appUserService.getUserCount(params.id)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, { count: result.value })
    },
    {
      requiredPlatformService: true,
      params: GetMiniAppUserCountParams,
      response: {
        200: GetMiniAppUserCountResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get Mini App User count',
        description:
          'Per-app App User count — the number of distinct users who have opened the mini app. Requires the platform service token.',
      },
    }
  )
