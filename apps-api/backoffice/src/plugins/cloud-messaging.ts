import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { Credentials, JWT } from 'google-auth-library'
import { fromPromise } from 'neverthrow'

import { ConfigServicePlugin } from './config'

export class CloudMessagingService {
  private JWT_TOKEN: Credentials | null = null
  constructor(
    private readonly config: {
      CLIENT_EMAIL: string
      PRIVATE_KEY: string
      PROJECT_ID: string
    }
  ) {}

  private async getAccessTokenAsync() {
    if (
      this.JWT_TOKEN &&
      this.JWT_TOKEN.access_token &&
      this.JWT_TOKEN.expiry_date &&
      this.JWT_TOKEN.expiry_date > Date.now()
    )
      return this.JWT_TOKEN.access_token

    const jwtClient = new JWT({
      email: this.config.CLIENT_EMAIL,
      key: this.config.PRIVATE_KEY,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })

    const resp = await fromPromise(jwtClient.authorize(), () => ({
      code: InternalErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to authorize JWT for FCM',
    }))

    if (resp.isErr()) {
      return err(resp.error)
    }

    if (!resp.value.access_token) {
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Failed to obtain access token for FCM',
      })
    }

    this.JWT_TOKEN = resp.value

    return resp.value.access_token
  }

  async sendNotification(deviceToken: string[], title: string, message: string, image?: string) {
    const accessToken = await this.getAccessTokenAsync()

    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${this.config.PROJECT_ID}/messages:send`

    await Promise.all(
      deviceToken.map(async (token) => {
        const body: any = {
          message: {
            token,
            notification: {
              title: title,
              body: message,
              image: image,
            },
            data: {
              volume: '3.21.15',
              contents: 'http://www.news-magazine.com/world-week/21659772',
            },
            android: {
              priority: 'normal',
            },
            apns: {
              headers: {
                'apns-priority': '5',
              },
            },
            webpush: {
              headers: {
                Urgency: 'high',
              },
            },
          },
        }

        const resp = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        })

        if (!resp.ok) {
          console.error('Failed to send FCM notification', await resp.text())
        }

        console.log('FCM response', await resp.text())
      })
    )
  }
}

export const CloudMessagingServicePlugin = new Elysia()
  .use(ConfigServicePlugin)
  .decorate(({ configService }) => ({
    cloudMessagingService: new CloudMessagingService({
      CLIENT_EMAIL: configService.get('FIREBASE_CLIENT_EMAIL'),
      PRIVATE_KEY: configService.get('FIREBASE_PRIVATE_KEY'),
      PROJECT_ID: configService.get('FIREBASE_PROJECT_ID'),
    }),
  }))
