import Elysia from 'elysia'

import { AppNotificationRepository } from './app-notification-repository'
import { AppNotificationService } from './app-notification-service'
import type { NotificationCallbackDispatcher } from './callback-delivery'
import { NotificationCallbackDeliveryPlugin } from './callback-delivery-plugin'
import { InteractionRepository } from './interaction-repository'
import { InteractionService } from './interaction-service'
import { NotificationService } from './notification-service'
import { NotificationRepository } from './repository'

import { CloudMessagingServicePlugin } from '../../plugins/cloud-messaging'
import { ConfigServicePlugin } from '../../plugins/config'
import { ElysiaLoggerPlugin } from '../../plugins/log'
import { PrismaServicePlugin } from '../../plugins/prisma'
import { SmsServicePlugin } from '../../plugins/sms'

export const AppNotificationRepositoryPlugin = new Elysia({
  name: 'AppNotificationRepository',
})
  .use([PrismaServicePlugin])
  .decorate(({ prismaService }) => ({
    appNotificationRepository: new AppNotificationRepository(prismaService),
  }))

export const NotificationRepositoryPlugin = new Elysia({
  name: 'NotificationRepositoryPlugin',
})
  .use([
    PrismaServicePlugin,
    CloudMessagingServicePlugin,
    SmsServicePlugin,
    ElysiaLoggerPlugin({ name: 'NotificationRepository' }),
  ])
  .decorate(({ prismaService, cloudMessagingService, smsService, loggerService }) => ({
    notificationRepository: new NotificationRepository(
      prismaService,
      cloudMessagingService,
      smsService,
      loggerService
    ),
  }))

export const NotificationServicePlugin = new Elysia({ name: 'NotificationService' })
  .use([NotificationRepositoryPlugin, ConfigServicePlugin])
  .decorate(({ notificationRepository, configService }) => ({
    notificationService: new NotificationService(
      notificationRepository,
      configService.get('MINIAPP_REDIRECT_ORIGIN'),
      {
        interactiveNotificationsEnabled: configService.get('INTERACTIVE_NOTIFICATIONS_ENABLED'),
        callbackConfig: {
          platformRelayUrl: configService.get('PLATFORM_CALLBACK_RELAY_URL'),
          platformRelayToken: configService.get('PLATFORM_CALLBACK_RELAY_TOKEN'),
          secretKey: configService.get('NOTIFICATION_CALLBACK_SECRET_KEY'),
        },
      }
    ),
  }))

export const AppNotificationServicePlugin = new Elysia({ name: 'AppNotificationService' })
  .use([AppNotificationRepositoryPlugin, NotificationRepositoryPlugin, ConfigServicePlugin])
  .decorate(({ appNotificationRepository, notificationRepository, configService }) => ({
    appNotificationService: new AppNotificationService(
      appNotificationRepository,
      notificationRepository,
      configService.get('MINIAPP_REDIRECT_ORIGIN'),
      () => new Date(),
      {
        interactiveNotificationsEnabled: configService.get('INTERACTIVE_NOTIFICATIONS_ENABLED'),
        callbackConfig: {
          platformRelayUrl: configService.get('PLATFORM_CALLBACK_RELAY_URL'),
          platformRelayToken: configService.get('PLATFORM_CALLBACK_RELAY_TOKEN'),
          secretKey: configService.get('NOTIFICATION_CALLBACK_SECRET_KEY'),
        },
      }
    ),
  }))

/**
 * Delivers an answer to the sending app: the answer endpoint calls
 * `notificationCallbackDispatcher.dispatchSoon(responseId)` after the response
 * row commits; the sweep retries anything left PENDING.
 */
export const NotificationCallbackDispatcherPlugin = new Elysia({
  name: 'NotificationCallbackDispatcher',
})
  .use(NotificationCallbackDeliveryPlugin)
  // Narrowed to the interface: the delivery service class must not leak into the
  // exported route types, which clients can't name (TS2742).
  .decorate(({ notificationCallbackDispatcher }) => ({
    notificationCallbackDispatcher:
      notificationCallbackDispatcher as NotificationCallbackDispatcher,
  }))

export const InteractionServicePlugin = new Elysia({ name: 'InteractionService' })
  .use([
    PrismaServicePlugin,
    CloudMessagingServicePlugin,
    NotificationCallbackDispatcherPlugin,
    ConfigServicePlugin,
    ElysiaLoggerPlugin({ name: 'InteractionService' }),
  ])
  .decorate(
    ({
      prismaService,
      cloudMessagingService,
      notificationCallbackDispatcher,
      configService,
      loggerService,
    }) => ({
      interactionService: new InteractionService(
        new InteractionRepository(prismaService),
        cloudMessagingService,
        notificationCallbackDispatcher,
        loggerService,
        {
          interactiveNotificationsEnabled: configService.get('INTERACTIVE_NOTIFICATIONS_ENABLED'),
          responseTokenSecret: configService.get('NOTIFICATION_RESPONSE_TOKEN_SECRET'),
          responseTokenSecretPrevious: configService.get(
            'NOTIFICATION_RESPONSE_TOKEN_SECRET_PREVIOUS'
          ),
        }
      ),
    })
  )
