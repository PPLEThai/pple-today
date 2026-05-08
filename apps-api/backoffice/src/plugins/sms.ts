import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import Elysia from 'elysia'
import { err, fromPromise, ok } from 'neverthrow'

import { ConfigServicePlugin } from './config'
import { ElysiaLoggerPlugin } from './log'

interface SmsSuccessResponse {
  remaining_credit: number
  total_use_credit: number
  credit_type: 'standard' | 'corporate'
  phone_number_list: {
    number: string
    message_id: string
    used_credit: number
  }[]
  bad_phone_number_list: {
    message: string
    number: string
  }[]
}

interface SmsErrorResponse {
  error: {
    code: string
    description: string
    name: string
  }
}

type SmsApiResponse = SmsSuccessResponse | SmsErrorResponse

export class SmsService {
  private readonly isConfigured: boolean

  constructor(
    private readonly loggerService: ElysiaLoggerInstance,
    private readonly config: {
      SMS_SERVICE_BASE_URL?: string
      SMS_SERVICE_API_KEY?: string
      SMS_SERVICE_SECRET_KEY?: string
      SMS_SERVICE_SENDER_NAME?: string
    }
  ) {
    this.isConfigured = !!(
      config.SMS_SERVICE_BASE_URL &&
      config.SMS_SERVICE_API_KEY &&
      config.SMS_SERVICE_SECRET_KEY &&
      config.SMS_SERVICE_SENDER_NAME
    )
  }

  async sendSms(phoneNumber: string, message: string) {
    if (!this.isConfigured) {
      this.loggerService.warn({
        message: 'SMS service is not configured, skipping SMS fallback',
        phoneNumber,
      })
      return err({
        code: InternalErrorCode.NOTIFICATION_SENT_FAILED,
        message: 'SMS service is not configured',
      })
    }

    const encodedParams = new URLSearchParams()
    encodedParams.set('msisdn', phoneNumber)
    encodedParams.set('message', message)
    encodedParams.set('sender', this.config.SMS_SERVICE_SENDER_NAME!)

    const token = `${this.config.SMS_SERVICE_API_KEY}:${this.config.SMS_SERVICE_SECRET_KEY}`
    const authHeader = `Basic ${Buffer.from(token).toString('base64')}`

    const fetchResult = await fromPromise(
      fetch(`${this.config.SMS_SERVICE_BASE_URL}/sms`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/x-www-form-urlencoded',
          authorization: authHeader,
        },
        body: encodedParams,
      }),
      (error) => {
        this.loggerService.error({
          message: 'Failed to reach SMS provider',
          phoneNumber,
          details: error,
        })
        return {
          code: InternalErrorCode.NOTIFICATION_SENT_FAILED,
          message: 'Failed to reach SMS provider',
        }
      }
    )

    if (fetchResult.isErr()) return fetchResult

    if (!fetchResult.value.ok) {
      const body = await fetchResult.value.json().catch(() => null)
      this.loggerService.error({
        message: 'SMS provider returned a non-OK status',
        phoneNumber,
        details: body,
      })
      return err({
        code: InternalErrorCode.NOTIFICATION_SENT_FAILED,
        message: 'SMS provider returned a non-OK status',
      })
    }

    const responseBody = (await fetchResult.value.json()) as SmsApiResponse

    if ('error' in responseBody) {
      this.loggerService.error({
        message: 'SMS provider returned an error',
        phoneNumber,
        details: responseBody.error,
      })
      return err({
        code: InternalErrorCode.NOTIFICATION_SENT_FAILED,
        message: `SMS send failed: ${responseBody.error.description}`,
      })
    }

    return ok(responseBody)
  }
}

export const SmsServicePlugin = new Elysia({ name: 'SmsService' })
  .use([ConfigServicePlugin, ElysiaLoggerPlugin({ name: 'SmsService' })])
  .decorate(({ configService, loggerService }) => ({
    smsService: new SmsService(loggerService, {
      SMS_SERVICE_BASE_URL: configService.get('SMS_SERVICE_BASE_URL'),
      SMS_SERVICE_API_KEY: configService.get('SMS_SERVICE_API_KEY'),
      SMS_SERVICE_SECRET_KEY: configService.get('SMS_SERVICE_SECRET_KEY'),
      SMS_SERVICE_SENDER_NAME: configService.get('SMS_SERVICE_SENDER_NAME'),
    }),
  }))
