import { WebhookFeedChanges } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const ValidateFacebookWebhookQuery = t.Object({
  'hub.mode': t.String({
    description: 'The mode of the webhook request, should be "subscribe"',
    enum: ['subscribe'],
  }),
  'hub.verify_token': t.String({
    description: 'The verification token to validate the webhook request',
    minLength: 1,
  }),
  'hub.challenge': t.String({
    description: 'The challenge string to respond with for verification',
    minLength: 1,
  }),
})
export type ValidateFacebookWebhookQuery = Static<typeof ValidateFacebookWebhookQuery>

export const ValidateFacebookWebhookResponse = t.String({
  description: 'The challenge string to respond with for verification',
})
export type ValidateFacebookWebhookResponse = Static<typeof ValidateFacebookWebhookResponse>

export const HandleFacebookWebhookHeaders = t.Object({
  'x-hub-signature-256': t.String({
    description: 'The SHA-256 signature header for the Facebook webhook request',
    minLength: 1,
  }),
})
export type HandleFacebookWebhookHeaders = Static<typeof HandleFacebookWebhookHeaders>

export const HandleFacebookWebhookBody = t.Object({
  object: t.String({
    description: 'The object type being sent in the webhook',
  }),
  entry: t.Array(
    t.Object({
      id: t.String({
        description: 'The ID of the Facebook page or user',
      }),
      time: t.Number({
        description: 'The time the change occurred in seconds since epoch',
      }),
      changes: t.Array(
        t.Object({
          field: t.Literal('feed'),
          value: WebhookFeedChanges,
        })
      ),
    })
  ),
})
export type HandleFacebookWebhookBody = Static<typeof HandleFacebookWebhookBody>

export const HandleFacebookWebhookResponse = t.Object({
  message: t.String({
    description: 'A message indicating the result of handling the webhook',
  }),
})
export type HandleFacebookWebhookResponse = Static<typeof HandleFacebookWebhookResponse>
