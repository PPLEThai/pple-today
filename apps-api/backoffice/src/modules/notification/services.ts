import Elysia from 'elysia'

import { AppNotificationService } from './app-notification-service'
import { NotificationService } from './notification-service'
import { AppNotificationRepositoryPlugin, NotificationRepositoryPlugin } from './repository'

import { ConfigServicePlugin } from '../../plugins/config'

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
