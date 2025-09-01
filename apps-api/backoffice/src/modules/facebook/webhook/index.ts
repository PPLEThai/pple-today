import { Check } from '@sinclair/typebox/value'
import Elysia from 'elysia'

import {
  HandleFacebookWebhookBody,
  HandleFacebookWebhookHeaders,
  ValidateFacebookWebhookQuery,
  ValidateFacebookWebhookResponse,
} from './models'
import { FacebookWebhookServicePlugin } from './services'

import { InternalErrorCode } from '../../../dtos/error'
import { createErrorSchema, mapErrorCodeToResponse } from '../../../utils/error'

export const FacebookWebhookController = new Elysia({
  prefix: '/webhook',
  detail: {
    hide: true,
  },
})
  .use(FacebookWebhookServicePlugin)
  .onParse(async ({ request, headers }) => {
    if (headers['content-type'] === 'application/json') {
      const arrayBuffer = await request.arrayBuffer()
      const rawBody = Buffer.from(arrayBuffer)

      return { rawBody, ...JSON.parse(rawBody.toString()) }
    }
  })
  .get(
    '/',
    async ({ query, status, facebookWebhookService }) => {
      const result = await facebookWebhookService.validateFacebookWebhook(query)

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
    async ({ body, headers, status, facebookWebhookService }) => {
      const isValidSignature = await facebookWebhookService.validateWebhookSignature(
        headers['x-hub-signature-256'],
        (body as any).rawBody
      )

      if (isValidSignature.isErr()) {
        return mapErrorCodeToResponse(isValidSignature.error, status)
      }

      if (!Check(HandleFacebookWebhookBody, body)) {
        return mapErrorCodeToResponse(
          {
            code: InternalErrorCode.FACEBOOK_WEBHOOK_NOT_SUPPORTED,
            message: 'Invalid webhook body',
          },
          status
        )
      }

      await facebookWebhookService.handleFacebookWebhook(body)

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
