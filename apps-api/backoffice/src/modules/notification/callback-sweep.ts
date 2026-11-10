import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { createErrorSchema, mapErrorCodeToResponse } from '@pple-today/api-common/utils'
import Elysia, { t } from 'elysia'

import { NotificationCallbackDeliveryPlugin } from './callback-delivery-plugin'
import { CallbackSweepAuthGuard } from './callback-sweep-guard'

import { ConfigServicePlugin } from '../../plugins/config'

export const NotificationCallbackSweepController = new Elysia({
  prefix: '/internal/notification-callbacks',
  tags: ['Internal'],
})
  .use(ConfigServicePlugin)
  .use(NotificationCallbackDeliveryPlugin)
  .decorate(({ configService, notificationCallbackDeliveryService }) => ({
    notificationCallbackDeliveryService,
    callbackSweepAuthGuard: new CallbackSweepAuthGuard(
      configService.get('NOTIFICATION_CALLBACK_SWEEP_TOKEN')
    ),
  }))
  .post(
    '/sweep',
    async ({ callbackSweepAuthGuard, notificationCallbackDeliveryService, headers, status }) => {
      const auth = callbackSweepAuthGuard.authenticate(headers)
      if (auth.isErr()) return mapErrorCodeToResponse(auth.error, status)

      return status(200, await notificationCallbackDeliveryService.sweep())
    },
    {
      response: {
        200: t.Object({
          claimed: t.Integer(),
          delivered: t.Integer(),
          retried: t.Integer(),
          failed: t.Integer(),
          purged: t.Integer(),
        }),
        ...createErrorSchema(InternalErrorCode.UNAUTHORIZED),
      },
      detail: {
        summary: 'Deliver due notification callbacks (CronJob only)',
        description:
          'Claims due NotificationResponse rows (FOR UPDATE SKIP LOCKED), delivers them with at most 10 in flight per app, then runs the 90-day values purge. Bearer NOTIFICATION_CALLBACK_SWEEP_TOKEN.',
        hide: true,
      },
    }
  )
