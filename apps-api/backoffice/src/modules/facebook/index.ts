import Elysia from 'elysia'

import {
  GetFacebookUserPageListQuery,
  GetFacebookUserPageListResponse,
  GetLinkedFacebookPageResponse,
  HandleFacebookWebhookHeaders,
  LinkFacebookPageToUserBody,
  LinkFacebookPageToUserResponse,
  RequestAccessTokenQuery,
  RequestAccessTokenResponse,
  UnlinkPageResponse,
  ValidateFacebookWebhookQuery,
  ValidateFacebookWebhookResponse,
} from './models'
import { FacebookServicePlugin } from './services'

import { InternalErrorCode } from '../../dtos/error'
import { AuthGuardPlugin } from '../../plugins/auth-guard'
import { createErrorSchema, exhaustiveGuard, mapErrorCodeToResponse } from '../../utils/error'

export const FacebookController = new Elysia({
  prefix: '/facebook',
  tags: ['Facebook'],
})
  .use([FacebookServicePlugin, AuthGuardPlugin])
  .group('/webhook', (app) =>
    app
      .get(
        '/',
        async ({ query, status, facebookService }) => {
          const result = await facebookService.validateFacebookWebhook(query)

          if (result.isErr()) {
            return mapErrorCodeToResponse(result.error, status)
          }

          return status(200, result.value)
        },
        {
          query: ValidateFacebookWebhookQuery,
          response: {
            200: ValidateFacebookWebhookResponse,
            ...createErrorSchema(InternalErrorCode.FACEBOOK_WEBHOOK_VERIFICATION_FAILED),
          },
          detail: {
            summary: 'Validate Facebook Webhook',
            description: 'Validates the Facebook webhook by responding with the challenge code',
          },
        }
      )
      .post(
        '/',
        async ({ body, headers, status, facebookService }) => {
          const isValidSignature = await facebookService.validateWebhookSignature(
            headers['x-hub-signature-256'],
            body
          )

          if (isValidSignature.isErr()) {
            return mapErrorCodeToResponse(isValidSignature.error, status)
          }

          return status(200, {
            message: 'Webhook event received successfully',
          })
        },
        {
          headers: HandleFacebookWebhookHeaders,
          detail: {
            summary: 'Handle Facebook Webhook',
            description: 'Handles incoming webhook events from Facebook',
          },
        }
      )
  )
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
            return status(500, {
              error: {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'Failed to fetch linked Facebook page',
              },
            })
          }

          return status(200, { linkedFacebookPage: linkedPageResult.value })
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
          const { facebookPageId, facebookPageAccessToken } = body

          const linkResult = await facebookService.linkFacebookPageToUser({
            userId: user.sub,
            facebookPageId,
            facebookPageAccessToken,
          })

          if (linkResult.isErr()) {
            return status(500, {
              error: {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'Failed to link Facebook page',
              },
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
            return status(500, {
              error: {
                code: InternalErrorCode.INTERNAL_SERVER_ERROR,
                message: 'Failed to unlink Facebook page',
              },
            })
          }

          return status(200, {
            message: 'Facebook page unlinked successfully',
          })
        },
        {
          requiredUser: true,
          response: {
            200: UnlinkPageResponse,
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
