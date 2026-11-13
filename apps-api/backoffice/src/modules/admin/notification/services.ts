import Elysia from 'elysia'

import { AdminNotificationSendService } from './admin-notification-send-service'
import { AdminNotificationService } from './admin-notification-service'
import { AdminNotificationRepository } from './repository'
import { AdminSentNotificationRepository } from './sent-repository'

import { ConfigServicePlugin } from '../../../plugins/config'
import { FileServicePlugin } from '../../../plugins/file'
import { PrismaServicePlugin } from '../../../plugins/prisma'
import { NotificationRepositoryPlugin } from '../../notification/services'

export { AdminNotificationSendService } from './admin-notification-send-service'
export { AdminNotificationService } from './admin-notification-service'

export const AdminNotificationServicePlugin = new Elysia({
  name: 'AdminNotificationService',
})
  .use(PrismaServicePlugin)
  .decorate(({ prismaService }) => ({
    adminNotificationService: new AdminNotificationService(
      new AdminNotificationRepository(prismaService)
    ),
  }))

export const AdminNotificationSendServicePlugin = new Elysia({
  name: 'AdminNotificationSendService',
})
  .use([PrismaServicePlugin, FileServicePlugin, NotificationRepositoryPlugin, ConfigServicePlugin])
  .decorate(({ prismaService, fileService, notificationRepository, configService }) => ({
    adminNotificationSendService: new AdminNotificationSendService(
      new AdminSentNotificationRepository(prismaService, fileService),
      notificationRepository,
      {
        miniAppRedirectOrigin: configService.get('MINIAPP_REDIRECT_ORIGIN'),
        interactiveNotificationsEnabled: configService.get('INTERACTIVE_NOTIFICATIONS_ENABLED'),
      }
    ),
  }))
