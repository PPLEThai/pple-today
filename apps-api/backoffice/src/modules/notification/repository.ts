import { PrismaService } from '@pple-today/api-common/services'
import { fromRepositoryPromise } from '@pple-today/api-common/utils'
import { NotificationLinkType } from '@pple-today/database/prisma'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { CloudMessagingService, CloudMessagingServicePlugin } from '../../plugins/cloud-messaging'
import { PrismaServicePlugin } from '../../plugins/prisma'

export class NotificationRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cloudMessagingService: CloudMessagingService
  ) {}

  async registerDeviceToken(userId: string, deviceToken: string) {
    return fromRepositoryPromise(
      this.prismaService.userNotificationToken.upsert({
        where: {
          userId_token: {
            userId,
            token: deviceToken,
          },
        },
        create: {
          userId,
          token: deviceToken,
        },
        update: {
          updatedAt: new Date(),
        },
      })
    )
  }

  async markAsRead(userId: string, notificationId: string) {
    return fromRepositoryPromise(
      this.prismaService.userNotification.updateMany({
        where: {
          userId,
          notificationId,
          isRead: false,
        },
        data: {
          readAt: new Date(),
          isRead: true,
        },
      })
    )
  }

  async markAllAsRead(userId: string) {
    return fromRepositoryPromise(
      this.prismaService.userNotification.updateMany({
        where: {
          userId,
          isRead: false,
        },
        data: {
          readAt: new Date(),
          isRead: true,
        },
      })
    )
  }

  async getNotificationHistory(userId: string, query: { cursor?: string; limit: number }) {
    return fromRepositoryPromise(async () => {
      const currentPageNotifications = await this.prismaService.userNotification.findMany({
        where: {
          userId,
        },
        orderBy: [
          {
            createdAt: 'desc',
          },
          {
            notificationId: 'desc',
          },
          {
            userId: 'desc',
          },
        ],
        take: query.limit,
        skip: query.cursor ? 1 : 0,
        cursor: query.cursor
          ? {
              userId_notificationId: {
                userId,
                notificationId: query.cursor,
              },
            }
          : undefined,
        include: {
          notification: true,
        },
      })

      const nextCursor =
        currentPageNotifications.length === query.limit
          ? currentPageNotifications[query.limit - 1].notificationId
          : undefined

      const previousCursor = query.cursor

      return {
        notifications: currentPageNotifications,
        nextCursor,
        previousCursor,
      }
    })
  }

  async testSendNotificationToDevice(phoneNumber: string, title: string, message: string) {
    const userTokens = await this.prismaService.userNotificationToken.findMany({
      where: {
        user: {
          phoneNumber,
        },
      },
    })

    const deviceTokens = userTokens.map((t) => t.token)

    if (deviceTokens.length === 0) {
      return ok()
    }

    await this.cloudMessagingService.sendNotification(deviceTokens, {
      title,
      message,
    })
    return ok()
  }

  async sendNotificationToUser(
    conditions: {
      isBroadcast?: boolean
      phoneNumber?: string[]
      districts?: string[]
      provinces?: string[]
      roles?: string[]
    },
    data: {
      title: string
      message: string
      url?: string
      link?: {
        type: NotificationLinkType
        value: string
      }
    }
  ) {
    this.prismaService.notification.create({
      data: {
        title: data.title,
        message: data.message,
        linkType: data.link?.type,
        linkValue: data.link?.value,

        isBroadcast: conditions.isBroadcast || false,
        districts: conditions.districts || [],
        provinces: conditions.provinces || [],
        roles: conditions.roles || [],
        phoneNumbers: {
          createMany: {
            data: conditions.phoneNumber?.map((phoneNumber) => ({ phoneNumber })) || [],
          },
        },
      },
    })
  }
}

export const NotificationRepositoryPlugin = new Elysia({
  name: 'NotificationRepositoryPlugin',
})
  .use([PrismaServicePlugin, CloudMessagingServicePlugin])
  .decorate(({ prismaService, cloudMessagingService }) => ({
    notificationRepository: new NotificationRepository(prismaService, cloudMessagingService),
  }))
