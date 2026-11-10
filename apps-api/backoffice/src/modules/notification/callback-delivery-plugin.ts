import Elysia from 'elysia'

import {
  NotificationCallbackDeliveryService,
  NotificationCallbackSender,
} from './callback-delivery'

import { ConfigServicePlugin } from '../../plugins/config'
import { ElysiaLoggerPlugin } from '../../plugins/log'
import { PrismaServicePlugin } from '../../plugins/prisma'

export const NotificationCallbackSenderPlugin = new Elysia({
  name: 'NotificationCallbackSender',
})
  .use([ConfigServicePlugin])
  .decorate(({ configService }) => ({
    notificationCallbackSender: new NotificationCallbackSender({
      platformRelayUrl: configService.get('PLATFORM_CALLBACK_RELAY_URL'),
      platformRelayToken: configService.get('PLATFORM_CALLBACK_RELAY_TOKEN'),
      secretKey: configService.get('NOTIFICATION_CALLBACK_SECRET_KEY'),
    }),
  }))

/**
 * Decorates `notificationCallbackDispatcher` with the real implementation
 * (claim, sign, POST, backoff) and exposes the same instance as
 * `notificationCallbackDeliveryService` for the sweep route.
 *
 * Integration: in `NotificationCallbackDispatcherPlugin` (services.ts) replace
 * the Noop `.decorate({ notificationCallbackDispatcher: new Noop...() })` with
 * `.use(NotificationCallbackDeliveryPlugin)`.
 */
export const NotificationCallbackDeliveryPlugin = new Elysia({
  name: 'NotificationCallbackDelivery',
})
  .use([
    PrismaServicePlugin,
    NotificationCallbackSenderPlugin,
    ElysiaLoggerPlugin({ name: 'NotificationCallbackDelivery' }),
  ])
  .decorate(({ prismaService, notificationCallbackSender, loggerService }) => {
    // NOTE: function-form `decorate` replaces the upstream decorators with what
    // it returns, so both names are returned from the one call.
    const notificationCallbackDeliveryService = new NotificationCallbackDeliveryService(
      prismaService,
      notificationCallbackSender,
      loggerService
    )
    return {
      notificationCallbackDeliveryService,
      notificationCallbackDispatcher: notificationCallbackDeliveryService,
    }
  })
