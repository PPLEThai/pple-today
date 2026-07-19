import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  ListMiniAppsQuery,
  ListMiniAppsResponse,
  ListMyMiniAppInvitesResponse,
  MiniAppInviteParams,
  RespondToMiniAppInviteResponse,
} from './models'
import { MiniAppInviteServicePlugin, MiniAppServicePlugin } from './services'

import { AuthGuardPlugin } from '../../plugins/auth-guard'

export const MiniAppController = new Elysia({ prefix: '/mini-app', tags: ['Mini Apps'] })
  .use([AuthGuardPlugin, MiniAppServicePlugin, MiniAppInviteServicePlugin])
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
  // The invitee's side of Beta invitations. Nothing here takes a mini app id on
  // trust: the invitation is always looked up by the *requesting user's own*
  // phone number, so a user can only ever answer invitations addressed to them.
  .get(
    '/invites',
    async ({ status, user, miniAppInviteService }) => {
      const invites = await miniAppInviteService.listPendingInvitesForUser(user.phoneNumber)

      if (invites.isErr()) {
        return mapErrorCodeToResponse(invites.error, status)
      }

      return status(200, invites.value)
    },
    {
      detail: {
        summary: 'List my pending mini app invitations',
        description:
          'Invitations addressed to the authenticated user’s phone number that they have not yet answered.',
      },
      requiredLocalUser: true,
      response: {
        200: ListMyMiniAppInvitesResponse,
        ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
      },
    }
  )
  .post(
    '/invites/:miniAppId/accept',
    async ({ status, user, params, miniAppInviteService }) => {
      const invite = await miniAppInviteService.respondToInvite(user, params.miniAppId, 'ACCEPT')

      if (invite.isErr()) {
        return mapErrorCodeToResponse(invite.error, status)
      }

      return status(200, invite.value)
    },
    {
      detail: {
        summary: 'Accept a mini app invitation',
        description:
          'Binds the invitation to the authenticated user’s account, after which the Beta mini app appears in their mini app list. Because the binding is to the account and not the phone number, later changing their number does not revoke access.',
      },
      requiredLocalUser: true,
      params: MiniAppInviteParams,
      response: {
        200: RespondToMiniAppInviteResponse,
        ...createErrorSchema(
          InternalErrorCode.MINI_APP_INVITE_NOT_FOUND,
          InternalErrorCode.MINI_APP_INVITE_ALREADY_RESPONDED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
  .post(
    '/invites/:miniAppId/decline',
    async ({ status, user, params, miniAppInviteService }) => {
      const invite = await miniAppInviteService.respondToInvite(user, params.miniAppId, 'DECLINE')

      if (invite.isErr()) {
        return mapErrorCodeToResponse(invite.error, status)
      }

      return status(200, invite.value)
    },
    {
      detail: {
        summary: 'Decline a mini app invitation',
        description:
          'Records the refusal. The mini app never appears in the user’s list, and the Builder’s tester seat is freed.',
      },
      requiredLocalUser: true,
      params: MiniAppInviteParams,
      response: {
        200: RespondToMiniAppInviteResponse,
        ...createErrorSchema(
          InternalErrorCode.MINI_APP_INVITE_NOT_FOUND,
          InternalErrorCode.MINI_APP_INVITE_ALREADY_RESPONDED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
    }
  )
