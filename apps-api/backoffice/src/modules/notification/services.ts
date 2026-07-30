import Elysia from 'elysia'

import { AppNotificationRepository } from './app-notification-repository'
import { AppNotificationService } from './app-notification-service'
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
  .use([NotificationRepositoryPlugin])
  .decorate(({ notificationRepository }) => ({
    notificationService: new NotificationService(notificationRepository),
  }))

export const AppNotificationServicePlugin = new Elysia({ name: 'AppNotificationService' })
  .use([AppNotificationRepositoryPlugin, NotificationRepositoryPlugin, ConfigServicePlugin])
  .decorate(({ appNotificationRepository, notificationRepository, configService }) => ({
    appNotificationService: new AppNotificationService(
      appNotificationRepository,
      notificationRepository,
      configService.get('MINIAPP_REDIRECT_ORIGIN')
    ),
  }))
