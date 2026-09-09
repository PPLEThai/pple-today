import Elysia from 'elysia'

import { AdminNotificationService } from './admin-notification-service'
import { AdminNotificationRepository } from './repository'

import { PrismaServicePlugin } from '../../../plugins/prisma'

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
