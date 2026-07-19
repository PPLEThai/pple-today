import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { PlatformAuthGuard } from './guard'
import {
  CreateMiniAppBody,
  CreateMiniAppResponse,
  GetMiniAppUserCountParams,
  GetMiniAppUserCountResponse,
  MiniAppIdParams,
  MiniAppResponse,
  RetireMiniAppResponse,
  SetRolesBody,
  SetTierBody,
  UpdateMiniAppBody,
} from './models'
import { PlatformMiniAppServicePlugin } from './services'

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
 * separate from admin/user auth. It drives a Builder App's whole lifecycle:
 * create (Zitadel OIDC app + Draft mini-app row + notification key), update,
 * set-tier, set-roles, and retire — plus the App User count. Every mutation
 * invalidates the mini-app list cache so effects show up in PPLE Today promptly.
 */
export const PlatformController = new Elysia({ prefix: '/platform', tags: ['Platform'] })
  .use([PlatformAuthGuardPlugin, AppUserServicePlugin, PlatformMiniAppServicePlugin])
  .post(
    '/mini-apps',
    async ({ body, status, platformMiniAppService }) => {
      const result = await platformMiniAppService.createMiniApp(body)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(201, result.value)
    },
    {
      requiredPlatformService: true,
      body: CreateMiniAppBody,
      response: {
        201: CreateMiniAppResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.MINI_APP_SLUG_ALREADY_EXISTS,
          InternalErrorCode.ZITADEL_NOT_CONFIGURED,
          InternalErrorCode.ZITADEL_APP_CREATE_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Create a Builder App',
        description:
          'Create a complete app registration in one call: a Zitadel OIDC app, a DRAFT/PLATFORM mini-app row owned by the Builder, and an app-bound notification key. Returns the clientId and the notification key (shown once). The app is immediately visible to its owner as a Draft.',
      },
    }
  )
  .patch(
    '/mini-apps/:id',
    async ({ params, body, status, platformMiniAppService }) => {
      const result = await platformMiniAppService.updateMiniApp(params.id, body)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredPlatformService: true,
      params: MiniAppIdParams,
      body: UpdateMiniAppBody,
      response: {
        200: MiniAppResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.MINI_APP_NOT_FOUND,
          InternalErrorCode.ZITADEL_NOT_CONFIGURED,
          InternalErrorCode.ZITADEL_APP_NOT_FOUND,
          InternalErrorCode.ZITADEL_REQUEST_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Update a Builder App',
        description:
          'Update presentation fields (name/icon/url). Changing the URL re-syncs the Zitadel redirect URIs.',
      },
    }
  )
  .put(
    '/mini-apps/:id/tier',
    async ({ params, body, status, platformMiniAppService }) => {
      const result = await platformMiniAppService.setTier(params.id, body.tier)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredPlatformService: true,
      params: MiniAppIdParams,
      body: SetTierBody,
      response: {
        200: MiniAppResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.MINI_APP_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: "Set a Builder App's tier",
        description:
          'Set the effective lifecycle tier (DRAFT/BETA/LIVE). The platform enforces who may change tier; today-v2 records the effective value and re-lists accordingly.',
      },
    }
  )
  .put(
    '/mini-apps/:id/roles',
    async ({ params, body, status, platformMiniAppService }) => {
      const result = await platformMiniAppService.setRoles(params.id, body.roles)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredPlatformService: true,
      params: MiniAppIdParams,
      body: SetRolesBody,
      response: {
        200: MiniAppResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.MINI_APP_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: "Set a Builder App's Live-tier visibility roles",
        description:
          'Replace the Live-tier visibility roles (reuses MiniAppRole). An empty array makes the app visible to everyone.',
      },
    }
  )
  .delete(
    '/mini-apps/:id',
    async ({ params, status, platformMiniAppService }) => {
      const result = await platformMiniAppService.retire(params.id)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredPlatformService: true,
      params: MiniAppIdParams,
      response: {
        200: RetireMiniAppResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.MINI_APP_NOT_FOUND,
          InternalErrorCode.ZITADEL_NOT_CONFIGURED,
          InternalErrorCode.ZITADEL_REQUEST_FAILED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Retire a Builder App',
        description:
          'Retire the app: delete its Zitadel OIDC app, soft-delete the mini-app row, and deactivate its notification key. The app disappears from every list; the row and App User registry are kept for audit.',
      },
    }
  )
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
