import Elysia from 'elysia'

import {
  GetFacebookUserPageListQuery,
  GetFacebookUserPageListResponse,
  GetLinkedFacebookPageResponse,
  LinkFacebookPageToUserBody,
  LinkFacebookPageToUserResponse,
  RequestAccessTokenQuery,
  RequestAccessTokenResponse,
  UnlinkPageResponse,
} from './models'
import { FacebookServicePlugin } from './services'
import { FacebookWebhookController } from './webhook'

import { UserRole } from '../../../__generated__/prisma'
import { InternalErrorCode } from '../../dtos/error'
import { AuthGuardPlugin } from '../../plugins/auth-guard'
import { createErrorSchema, mapErrorCodeToResponse } from '../../utils/error'

export const FacebookController = new Elysia({
  prefix: '/facebook',
  tags: ['Facebook'],
})
  .use([FacebookServicePlugin, AuthGuardPlugin])
  .use(FacebookWebhookController)
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
          requiredLocalRole: [UserRole.REPRESENTATIVE],
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
          requiredLocalRole: [UserRole.REPRESENTATIVE],
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
          requiredLocalRole: [UserRole.REPRESENTATIVE],
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
            return mapErrorCodeToResponse(
              {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'Failed to link Facebook page',
              },
              status
            )
          }

          return status(201, {
            message: 'Facebook page linked successfully',
          })
        },
        {
          requiredLocalRole: [UserRole.REPRESENTATIVE],
          body: LinkFacebookPageToUserBody,
          response: {
            201: LinkFacebookPageToUserResponse,
            ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
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
          requiredLocalRole: [UserRole.REPRESENTATIVE],
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
