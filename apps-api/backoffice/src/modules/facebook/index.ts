import node from '@elysiajs/node'
import Elysia from 'elysia'
import { err } from 'neverthrow'

import {
  FacebookUnlinkPageResponse,
  GetFacebookUserPageListQuery,
  GetFacebookUserPageListResponse,
  GetLinkedFacebookPageResponse,
  LinkFacebookPageToUserBody,
  LinkFacebookPageToUserResponse,
  RequestAccessTokenQuery,
  RequestAccessTokenResponse,
} from './models'
import { FacebookServicePlugin } from './services'

import { InternalErrorCode } from '../../dtos/error'
import { AuthGuardPlugin } from '../../plugins/auth-guard'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../utils/error'

export const FacebookController = new Elysia({
  adapter: node(),
  prefix: '/facebook',
  tags: ['Facebook'],
})
  .use([FacebookServicePlugin, AuthGuardPlugin])
  .group('/token', (app) =>
    app
      .get(
        '/callback',
        async ({ query, status, facebookService }) => {
          const { code, redirectUri } = query

          const accessTokenResult = await facebookService.getUserAccessToken(code, redirectUri)
          if (accessTokenResult.isErr()) {
            switch (accessTokenResult.error.code) {
              case InternalErrorCode.FACEBOOK_API_ERROR:
                return mapErrorCodeToResponse(accessTokenResult.error, status)
              case InternalErrorCode.FACEBOOK_INVALID_RESPONSE:
                return mapErrorCodeToResponse(accessTokenResult.error, status)
              default:
                exhaustiveGuard(accessTokenResult.error)
            }
          }

          return status(200, accessTokenResult.value)
        },
        {
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
            switch (pageList.error.code) {
              case InternalErrorCode.FACEBOOK_API_ERROR:
                return mapErrorCodeToResponse(pageList.error, status)
              case InternalErrorCode.FACEBOOK_INVALID_RESPONSE:
                return mapErrorCodeToResponse(pageList.error, status)
              case InternalErrorCode.FACEBOOK_INVALID_ACCESS_TOKEN:
                return mapErrorCodeToResponse(pageList.error, status)
              default:
                exhaustiveGuard(pageList.error)
            }
          }

          return status(200, pageList.value)
        },
        {
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
          const linkedPageResult = await facebookService.getLinkedFacebookPage(user.sub)

          if (linkedPageResult.isErr()) {
            return err({
              code: InternalErrorCode.INTERNAL_SERVER_ERROR,
              message: 'Failed to fetch linked Facebook page',
            })
          }

          return status(200, linkedPageResult.value)
        },
        {
          requiredUser: true,
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
          const { facebookPageId, facebookAccessToken } = body

          const linkResult = await facebookService.linkFacebookPageToUser({
            userId: user.sub,
            facebookPageId,
            facebookAccessToken,
          })

          if (linkResult.isErr()) {
            return err({
              code: InternalErrorCode.INTERNAL_SERVER_ERROR,
              message: 'Failed to link Facebook page',
            })
          }

          return status(201, {
            message: 'Facebook page linked successfully',
          })
        },
        {
          requiredUser: true,
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
          const unlinkResult = await facebookService.unlinkFacebookPageFromUser(user.sub)

          if (unlinkResult.isErr()) {
            return err({
              code: InternalErrorCode.INTERNAL_SERVER_ERROR,
              message: 'Failed to unlink Facebook page',
            })
          }

          return status(200, {
            message: 'Facebook page unlinked successfully',
          })
        },
        {
          requiredUser: true,
          response: {
            200: FacebookUnlinkPageResponse,
            ...createErrorSchema(InternalErrorCode.INTERNAL_SERVER_ERROR),
          },
          detail: {
            summary: 'Unlink Facebook Page',
            description: 'Unlinks a Facebook page from the user account',
          },
        }
      )
  )
  .as('scoped')
