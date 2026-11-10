import Elysia from 'elysia'

import { AppNotificationRepository } from './app-notification-repository'
import { AppNotificationService } from './app-notification-service'
import {
  NoopNotificationCallbackDispatcher,
  type NotificationCallbackDispatcher,
} from './callback-delivery'
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
      { interactiveNotificationsEnabled: configService.get('INTERACTIVE_NOTIFICATIONS_ENABLED') }
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
      { interactiveNotificationsEnabled: configService.get('INTERACTIVE_NOTIFICATIONS_ENABLED') }
    ),
  }))

/**
 * THE INJECTION POINT for delivering an answer to the sending app.
 *
 * Answering an interactive notification calls
 * `notificationCallbackDispatcher.dispatchSoon(responseId)` after the response
 * row commits. This decorates it with the no-op, so answers are recorded but
 * not yet delivered (the sweep, once it exists, picks them up from the outbox).
 * The callback-delivery track replaces this one decoration with the real
 * dispatcher; nothing else needs to change.
 */
export const NotificationCallbackDispatcherPlugin = new Elysia({
  name: 'NotificationCallbackDispatcher',
}).decorate({
  notificationCallbackDispatcher:
    new NoopNotificationCallbackDispatcher() as NotificationCallbackDispatcher,
})

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
        }
      ),
    })
  )
