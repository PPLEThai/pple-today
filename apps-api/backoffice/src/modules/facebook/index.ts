import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia from 'elysia'

import {
  GetFacebookConfigResponse,
  GetFacebookUserPageListQuery,
  GetFacebookUserPageListResponse,
  GetLinkedFacebookPageResponse,
  GetLinkedPageAvailableStatusQuery,
  GetLinkedPageAvailableStatusResponse,
  LinkFacebookPageToUserBody,
  LinkFacebookPageToUserResponse,
  RequestAccessTokenQuery,
  RequestAccessTokenResponse,
  UnlinkPageResponse,
} from './models'
import { FacebookServicePlugin } from './services'
import { FacebookWebhookController } from './webhook'

import { FACEBOOK_CONNECT_ALLOWED_ROLES } from '../../constants/roles'
import { AuthGuardPlugin } from '../../plugins/auth-guard'

/**
 * The one precondition every Facebook page endpoint enforces — and the same
 * question `GET /facebook/config` answers for clients, so the section a user
 * sees and the routes they may call can never disagree.
 *
 * The roles are `pple-ad:`-prefixed, so `checkUserPrecondition` resolves them
 * live from SSO AD (active role + extra roles) rather than the OIDC token.
 */
const FACEBOOK_CONNECT_PRECONDITION = {
  allowedRoles: FACEBOOK_CONNECT_ALLOWED_ROLES,
  isActive: true,
}

export const FacebookController = new Elysia({
  prefix: '/facebook',
  tags: ['Facebook'],
})
  .use([FacebookServicePlugin, AuthGuardPlugin])
  .use(FacebookWebhookController)
  .get(
    '/config',
    async ({ status, headers, authGuard }) => {
      // Ask the guard the same question it asks on every other route here, so a
      // client never shows an entry point the API would refuse. Only FORBIDDEN
      // is an answer — an unresolvable token or an SSO outage stays an error
      // rather than a silently hidden section.
      const checkResult = await authGuard.checkUserPrecondition(
        headers,
        FACEBOOK_CONNECT_PRECONDITION
      )

      if (checkResult.isErr() && checkResult.error.code !== InternalErrorCode.FORBIDDEN) {
        // Everything the guard can fail with other than FORBIDDEN is either an
        // unusable token or a broken dependency; narrow it to the two the caller
        // can act on rather than leaking the guard's whole error surface here.
        return mapErrorCodeToResponse(
          checkResult.error.code === InternalErrorCode.UNAUTHORIZED
            ? { code: InternalErrorCode.UNAUTHORIZED, message: checkResult.error.message }
            : {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'Failed to resolve Facebook page permission',
              },
          status
        )
      }

      return status(200, { canConnectPage: checkResult.isOk() })
    },
    {
      response: {
        200: GetFacebookConfigResponse,
        ...createErrorSchema(
          InternalErrorCode.UNAUTHORIZED,
          InternalErrorCode.INTERNAL_SERVER_ERROR
        ),
      },
      detail: {
        summary: 'Get Facebook Feature Config',
        description:
          'Whether the caller may connect a Facebook page, decided from their SSO AD roles so clients need no role list of their own',
      },
    }
  )
  // TODO: Remove this endpoint groups
  .group('/token', (app) =>
    app
      .get(
        '/callback',
        async ({ query, status, facebookService }) => {
          const { code, redirectUri } = query

          const accessTokenResult = await facebookService.getUserAccessToken(code, redirectUri)
          if (accessTokenResult.isErr()) {
            return mapErrorCodeToResponse(accessTokenResult.error, status)
          }

          return status(200, accessTokenResult.value)
        },
        {
          requiredLocalUserPrecondition: FACEBOOK_CONNECT_PRECONDITION,
          detail: {
            summary: 'Get Facebook User Access Token',
            description: 'Fetches the user access token from Facebook using the authorization code',
          },
          query: RequestAccessTokenQuery,
          response: {
            200: RequestAccessTokenResponse,
            ...createErrorSchema(
              InternalErrorCode.FACEBOOK_API_ERROR,
              InternalErrorCode.FACEBOOK_INVALID_RESPONSE
            ),
          },
        }
      )
      .get(
        '/pages',
        async ({ query, status, facebookService }) => {
          const { facebookToken } = query
          const pageList = await facebookService.getUserPageList(facebookToken)

          if (pageList.isErr()) {
            return mapErrorCodeToResponse(pageList.error, status)
          }

          return status(200, pageList.value)
        },
        {
          requiredLocalUserPrecondition: FACEBOOK_CONNECT_PRECONDITION,
          detail: {
            summary: 'Get Facebook User Page List',
            description: 'Fetches the list of Facebook pages associated with the user',
          },
          query: GetFacebookUserPageListQuery,
          response: {
            200: GetFacebookUserPageListResponse,
            ...createErrorSchema(
              InternalErrorCode.FACEBOOK_API_ERROR,
              InternalErrorCode.FACEBOOK_INVALID_RESPONSE,
              InternalErrorCode.FACEBOOK_INVALID_ACCESS_TOKEN
            ),
          },
        }
      )
  )
  .group('/linked-page', (app) =>
    app
      .get(
        '/available',
        async ({ query, status, facebookService }) => {
          const availableStatus = await facebookService.getLinkedPageAvailableStatus(query.pageIds)

          if (availableStatus.isErr()) {
            return mapErrorCodeToResponse(availableStatus.error, status)
          }

          return status(200, availableStatus.value)
        },
        {
          detail: {
            summary: 'Get Linked Facebook Page Available Status',
            description:
              'Checks the availability status of Facebook pages for linking to the user account',
          },
          requiredLocalUserPrecondition: FACEBOOK_CONNECT_PRECONDITION,
          query: GetLinkedPageAvailableStatusQuery,
          response: {
            200: GetLinkedPageAvailableStatusResponse,
            ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
          },
        }
      )
      .get(
        '/',
        async ({ status, facebookService, user }) => {
          const linkedPageResult = await facebookService.getLinkedFacebookPage(user.id)

          if (linkedPageResult.isErr()) {
            return mapErrorCodeToResponse(
              {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'Failed to fetch linked Facebook page',
              },
              status
            )
          }

          return status(200, { linkedFacebookPage: linkedPageResult.value })
        },
        {
          requiredLocalUserPrecondition: FACEBOOK_CONNECT_PRECONDITION,
          response: {
            200: GetLinkedFacebookPageResponse,
            ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
          },
          detail: {
            summary: 'Get Linked Facebook Page',
            description: 'Fetches the linked Facebook page for the user',
          },
        }
      )
      .post(
        '/',
        async ({ body, status, facebookService, user }) => {
          const { facebookPageId, facebookPageAccessToken } = body

          const linkResult = await facebookService.linkFacebookPageToUser({
            userId: user.id,
            facebookPageId,
            facebookPageAccessToken,
          })

          if (linkResult.isErr()) {
            return mapErrorCodeToResponse(linkResult.error, status)
          }

          return status(201, {
            message: 'Facebook page linked successfully',
          })
        },
        {
          requiredLocalUserPrecondition: FACEBOOK_CONNECT_PRECONDITION,
          body: LinkFacebookPageToUserBody,
          response: {
            201: LinkFacebookPageToUserResponse,
            ...createErrorSchema(
              InternalErrorCode.INTERNAL_SERVER_ERROR,
              InternalErrorCode.FACEBOOK_API_ERROR,
              InternalErrorCode.FACEBOOK_INVALID_RESPONSE,
              InternalErrorCode.FACEBOOK_INVALID_ACCESS_TOKEN,
              InternalErrorCode.FACEBOOK_PAGE_ALREADY_LINKED,
              InternalErrorCode.FILE_UPLOAD_ERROR,
              InternalErrorCode.FILE_CHANGE_PERMISSION_ERROR,
              InternalErrorCode.FILE_MOVE_ERROR,
              InternalErrorCode.FILE_ROLLBACK_FAILED,
              InternalErrorCode.USER_NOT_FOUND
            ),
          },
          detail: {
            summary: 'Link Facebook Page',
            description: 'Links a Facebook page to the user account',
          },
        }
      )
      .delete(
        '/',
        async ({ status, facebookService, user }) => {
          const unlinkResult = await facebookService.unlinkFacebookPageFromUser(user.id)

          if (unlinkResult.isErr()) {
            return mapErrorCodeToResponse(unlinkResult.error, status)
          }

          return status(200, {
            message: 'Facebook page unlinked successfully',
          })
        },
        {
          requiredLocalUserPrecondition: FACEBOOK_CONNECT_PRECONDITION,
          response: {
            200: UnlinkPageResponse,
            ...createErrorSchema(
              InternalErrorCode.INTERNAL_SERVER_ERROR,
              InternalErrorCode.FACEBOOK_API_ERROR,
              InternalErrorCode.FACEBOOK_INVALID_RESPONSE,
              InternalErrorCode.FACEBOOK_LINKED_PAGE_NOT_FOUND
            ),
          },
          detail: {
            summary: 'Unlink Facebook Page',
            description: 'Unlinks a Facebook page from the user account',
          },
        }
      )
  )
  .as('scoped')
