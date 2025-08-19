import * as crypto from 'node:crypto'

import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { ValidateFacebookWebhookQuery } from './models'

import serverEnv from '../../../config/env'
import { InternalErrorCode } from '../../../dtos/error'
import { err } from '../../../utils/error'

export class FacebookWebhookService {
  constructor(
    private readonly facebookConfig: {
      appSecret: string
      verifyToken: string
    }
  ) {}

  async validateWebhookSignature(signature: string, body: Buffer) {
    if (!signature.startsWith('sha256=')) {
      return err({
        code: InternalErrorCode.FACEBOOK_WEBHOOK_INVALID_SIGNATURE,
        message: 'Invalid signature format',
      })
    }

    const sha256Signature = signature.replace('sha256=', '')

    const hmac = crypto.createHmac('sha256', this.facebookConfig.appSecret)
    const hash = hmac.update(body).digest('hex')

    if (sha256Signature !== hash) {
      return err({
        code: InternalErrorCode.FACEBOOK_WEBHOOK_INVALID_SIGNATURE,
        message: 'Invalid signature',
      })
    }

    return ok()
  }

  async validateFacebookWebhook(query: ValidateFacebookWebhookQuery) {
    const { 'hub.mode': mode, 'hub.verify_token': verifyToken, 'hub.challenge': challenge } = query

    if (mode !== 'subscribe' || verifyToken !== this.facebookConfig.verifyToken) {
      return err({
        code: InternalErrorCode.FACEBOOK_WEBHOOK_VERIFICATION_FAILED,
        message: 'Invalid verification token or mode',
      })
    }

    return ok(challenge)
  }
}

export const FacebookWebhookServicePlugin = new Elysia({
  name: 'FacebookWebhookService',
}).decorate(() => ({
  facebookWebhookService: new FacebookWebhookService({
    appSecret: serverEnv.FACEBOOK_APP_SECRET,
    verifyToken: serverEnv.FACEBOOK_WEBHOOK_VERIFY_TOKEN,
  }),
}))
