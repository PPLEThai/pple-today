import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import { PlatformAuthGuard } from './guard'
import {
  CreateMiniAppBody,
  CreateMiniAppInviteBody,
  CreateMiniAppInviteResponse,
  CreateMiniAppResponse,
  DeleteMiniAppInviteParams,
  DeleteMiniAppInviteResponse,
  GetMiniAppNotificationUsageResponse,
  GetMiniAppUserCountParams,
  GetMiniAppUserCountResponse,
  ListMiniAppInvitesResponse,
  LookupUserBody,
  LookupUserResponse,
  MiniAppIdParams,
  MiniAppResponse,
  RetireMiniAppResponse,
  SetNotificationQuotaBody,
  SetNotificationQuotaResponse,
  SetRolesBody,
  SetTierBody,
  UpdateMiniAppBody,
} from './models'
import { PlatformMiniAppServicePlugin, PlatformUserLookupServicePlugin } from './services'

import { ConfigServicePlugin } from '../../plugins/config'
import { AppUserServicePlugin, MiniAppInviteServicePlugin } from '../mini-app/services'
import { AppNotificationServicePlugin } from '../notification/services'

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
 *
 * It also answers the one identity question the platform cannot answer itself:
 * which PPLE ID a given phone number belongs to, for Collaborator-by-phone.
 */
export const PlatformController = new Elysia({ prefix: '/platform', tags: ['Platform'] })
  .use([
    PlatformAuthGuardPlugin,
    AppUserServicePlugin,
    PlatformMiniAppServicePlugin,
    MiniAppInviteServicePlugin,
    AppNotificationServicePlugin,
    PlatformUserLookupServicePlugin,
  ])
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
  // The Resource Limit on an app's notifications. The platform owns the
  // approval (a LimitRequest); today-v2 only records the effective number.
  .put(
    '/mini-apps/:id/notification-quota',
    async ({ params, body, status, appNotificationService }) => {
      const result = await appNotificationService.setDailyQuota(params.id, body.dailyQuota)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredPlatformService: true,
      params: MiniAppIdParams,
      body: SetNotificationQuotaBody,
      response: {
        200: SetNotificationQuotaResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.NOTIFICATION_API_KEY_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: "Set a Builder App's daily notification quota",
        description:
          "Set how many audience-bound notifications the app may send per day (Asia/Bangkok). This is how an approved LimitRequest takes effect. Applies to the app's active notification key; a retired app has none.",
      },
    }
  )
  // Sends authenticate with the app's Notification Key and never traverse the
  // platform, so today-v2 exposes the count it meters for the Console Usage tile.
  .get(
    '/mini-apps/:id/notification-usage',
    async ({ params, status, appNotificationService }) => {
      const result = await appNotificationService.getNotificationUsage(params.id)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredPlatformService: true,
      params: MiniAppIdParams,
      response: {
        200: GetMiniAppNotificationUsageResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.NOTIFICATION_API_KEY_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: "Get a Builder App's notification sends today",
        description:
          "How many audience-bound notifications the app has sent in the current Asia/Bangkok quota day — the same window that drives the daily quota 429. Requires the platform service token. An app with no active key is not-found.",
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
  // The Builder's side of Beta invitations, reached through the Console rather
  // than directly: the Console holds the workflow (who may invite, and when) and
  // proxies here with its service token. today-v2 stores only the effective
  // facts — who is invited, and whether they said yes.
  .get(
    '/mini-apps/:id/invites',
    async ({ status, params, miniAppInviteService }) => {
      const invites = await miniAppInviteService.listInvites(params.id)

      if (invites.isErr()) {
        return mapErrorCodeToResponse(invites.error, status)
      }

      return status(200, invites.value)
    },
    {
      requiredPlatformService: true,
      params: MiniAppIdParams,
      response: {
        200: ListMiniAppInvitesResponse,
        ...createErrorSchema(
          InternalErrorCode.MINI_APP_NOT_FOUND,
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'List a Mini App’s Beta testers',
        description:
          'Every invitation on the app with its current status, including declined ones. Requires the platform service token.',
      },
    }
  )
  .post(
    '/mini-apps/:id/invites',
    async ({ status, params, body, miniAppInviteService }) => {
      const invite = await miniAppInviteService.createInvite(params.id, body.phoneNumber)

      if (invite.isErr()) {
        return mapErrorCodeToResponse(invite.error, status)
      }

      return status(201, invite.value)
    },
    {
      requiredPlatformService: true,
      params: MiniAppIdParams,
      body: CreateMiniAppInviteBody,
      response: {
        201: CreateMiniAppInviteResponse,
        ...createErrorSchema(
          InternalErrorCode.MINI_APP_NOT_FOUND,
          InternalErrorCode.MINI_APP_INVITE_ALREADY_EXISTS,
          InternalErrorCode.MINI_APP_INVITE_LIMIT_EXCEEDED,
          InternalErrorCode.MINI_APP_INVITE_INVALID_PHONE_NUMBER,
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Invite a Beta tester',
        description:
          'Invites one tester by phone number and delivers the invitation as a PPLE Today notification. The app’s tester cap is enforced here; a declined invitation frees its seat. The invitee sees nothing in their mini app list until they accept. Requires the platform service token.',
      },
    }
  )
  .delete(
    '/mini-apps/:id/invites/:phoneNumber',
    async ({ status, params, miniAppInviteService }) => {
      const result = await miniAppInviteService.deleteInvite(params.id, params.phoneNumber)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, { message: 'Invite removed successfully' })
    },
    {
      requiredPlatformService: true,
      params: DeleteMiniAppInviteParams,
      response: {
        200: DeleteMiniAppInviteResponse,
        ...createErrorSchema(
          InternalErrorCode.MINI_APP_NOT_FOUND,
          InternalErrorCode.MINI_APP_INVITE_NOT_FOUND,
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Remove a Beta tester',
        description:
          'Revokes the invitation. If the tester had accepted, the app disappears from their mini app list on their next listing — eligibility is read live, so there is no grant left behind. Requires the platform service token.',
      },
    }
  )
  // Identity behind a phone number, for the platform's Collaborator-by-phone
  // flow (PPLEThai/pple-platform#35). A POST rather than a GET so the number
  // travels in a body: query strings land in access logs and proxy caches, and a
  // phone number should not be scattered across either.
  .post(
    '/users/lookup',
    async ({ body, status, platformUserLookupService }) => {
      const result = await platformUserLookupService.lookupByPhoneNumber(body.phoneNumber)

      if (result.isErr()) {
        return mapErrorCodeToResponse(result.error, status)
      }

      return status(200, result.value)
    },
    {
      requiredPlatformService: true,
      body: LookupUserBody,
      response: {
        200: LookupUserResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.USER_NOT_FOUND,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Resolve a phone number to a PPLE identity',
        description:
          'Exact full-number match only, returning the account’s `sub` and full name so the platform can ask an Owner to confirm a masked name before granting Collaborator access. This is deliberately not a directory or people-search: a partial number is never searched on, and an incomplete number is reported as not-found exactly like an unknown one. Requires the platform service token; the Provisioner is the only caller.',
      },
    }
  )
