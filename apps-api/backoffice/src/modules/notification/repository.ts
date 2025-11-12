import { ElysiaLoggerInstance, ElysiaLoggerPlugin } from '@pple-today/api-common/plugins'
import { PrismaService } from '@pple-today/api-common/services'
import { exhaustiveGuard, fromRepositoryPromise } from '@pple-today/api-common/utils'
import { NotificationLinkType, Prisma } from '@pple-today/database/prisma'
import crypto from 'crypto'
import Elysia from 'elysia'
import { ok } from 'neverthrow'
import * as R from 'remeda'

import { CreateNewExternalNotificationBody } from './models'

import { CloudMessagingService, CloudMessagingServicePlugin } from '../../plugins/cloud-messaging'
import { PrismaServicePlugin } from '../../plugins/prisma'

export class NotificationRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cloudMessagingService: CloudMessagingService,
    private readonly loggerService: ElysiaLoggerInstance
  ) {}

  private getFilterConditions(
    audience: CreateNewExternalNotificationBody['audience']
  ): Prisma.UserFindManyArgs['where'] {
    switch (audience.type) {
      case 'ROLE':
        return {
          roles: {
            some: {
              role: { in: audience.details },
            },
          },
        }
      case 'PHONE_NUMBER':
        return {
          phoneNumber: {
            in: audience.details,
          },
        }
      case 'ADDRESS':
        return {
          OR: [
            {
              province: { in: audience.details.provinces },
            },
            {
              district: { in: audience.details.districts },
            },
          ],
        }
      case 'BROADCAST':
        return {}
      default:
        exhaustiveGuard(audience)
    }
  }

  async checkApiKey(apiKey: string) {
    return fromRepositoryPromise(
      this.prismaService.notificationApiKey.findUnique({
        where: {
          apiKey: crypto.hash('sha256', apiKey),
          active: true,
        },
        select: {
          id: true,
        },
      })
    )
  }

  async listNotifications(userId: string, cursor?: string, limit: number = 20) {
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
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor
          ? {
              userId_notificationId: {
                userId,
                notificationId: cursor,
              },
            }
          : undefined,
        include: {
          notification: true,
        },
      })

      const nextCursor =
        currentPageNotifications.length === limit
          ? currentPageNotifications[limit - 1].notificationId
          : null

      const previousCursor = cursor || null

      return {
        notifications: currentPageNotifications,
        nextCursor,
        previousCursor,
      }
    })
  }

  async registerDeviceToken(userId: string, deviceToken: string) {
    return fromRepositoryPromise(
      this.prismaService.userNotificationToken.upsert({
        where: {
          token: deviceToken,
        },
        create: {
          userId,
          token: deviceToken,
        },
        update: {
          userId,
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

  async getNotificationDetailsById(userId: string, notificationId: string) {
    return fromRepositoryPromise(
      this.prismaService.userNotification.findUniqueOrThrow({
        where: {
          userId_notificationId: {
            userId,
            notificationId,
          },
        },
        include: {
          notification: true,
        },
      })
    )
  }

  async sendNotificationToUser(
    conditions: CreateNewExternalNotificationBody['audience'],
    data: {
      header: string
      message: string
      image?: string
      actionButtonText?: string
      link?: {
        type: NotificationLinkType
        value: string
      }
    },
    apiKeyId: string
  ) {
    const createResult = await fromRepositoryPromise(async () => {
      const [newNotification] = await this.prismaService.$transaction([
        this.prismaService.notification.create({
          data: {
            title: data.header,
            message: data.message,
            image: data.image,
            linkType: data.link?.type,
            linkValue: data.link?.value,
            actionButtonText: data?.actionButtonText,

            isBroadcast: conditions.type === 'BROADCAST' ? true : false,
            districts: conditions.type === 'ADDRESS' ? conditions.details.districts : undefined,
            provinces: conditions.type === 'ADDRESS' ? conditions.details.provinces : undefined,
            roles: conditions.type === 'ROLE' ? conditions.details : undefined,
            phoneNumbers:
              conditions.type === 'PHONE_NUMBER'
                ? {
                    createMany: {
                      data: conditions.details?.map((phoneNumber) => ({ phoneNumber })) || [],
                    },
                  }
                : undefined,
          },
        }),
        this.prismaService.notificationApiKeyUsageLog.create({
          data: {
            body: JSON.stringify({ conditions, data }),
            notificationApiKey: {
              connect: {
                id: apiKeyId,
              },
            },
          },
        }),
      ])

      const whereConditions = this.getFilterConditions(conditions)

      const users = await this.prismaService.user.findMany({
        where: whereConditions,
        select: {
          id: true,
          phoneNumber: true,
          notificationTokens: {
            select: {
              token: true,
            },
          },
        },
      })

      await this.prismaService.userNotification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          notificationId: newNotification.id,
        })),
        skipDuplicates: true,
      })

      return {
        users,
        newNotification,
      }
    })

    if (createResult.isErr()) {
      return createResult
    }

    const { users, newNotification } = createResult.value

    const phoneNumberWithTokens = users.flatMap((u) => ({
      phoneNumber: u.phoneNumber,
      token: u.notificationTokens.map((t) => t.token),
    }))

    const notFoundUser =
      conditions.type === 'PHONE_NUMBER'
        ? R.difference(
            conditions.details,
            phoneNumberWithTokens.map((p) => p.phoneNumber)
          )
        : undefined
    const emptyTokens = phoneNumberWithTokens.filter((p) => p.token.length === 0)
    const nonEmptyTokens = phoneNumberWithTokens.filter((p) => p.token.length > 0)

    const notificationResult = await Promise.all(
      nonEmptyTokens.map(async (p) => {
        return {
          phoneNumber: p.phoneNumber,
          result: await this.cloudMessagingService.sendNotifications(p.token, {
            title: data.header,
            message: data.message,
            image: data.image,
            link: {
              type: 'IN_APP_NAVIGATION',
              value: `/notification/${newNotification.id}`,
            },
          }),
        }
      })
    )

    this.loggerService.info({
      message: 'Attempt sending push notification to user',
      details: {
        totalUsers: phoneNumberWithTokens.length,
        successfulDeliveries: nonEmptyTokens.length,
        failedDeliveries: emptyTokens.length,
        nonExisted: notFoundUser?.length || 0,
        notification: {
          header: data.header,
          message: data.message,
          image: data.image,
          link: {
            type: 'IN_APP_NAVIGATION',
            value: `/notification/${newNotification.id}`,
          },
        },
      },
    })

    const failedResult = notificationResult.filter((r) => r.result.isErr())
    if (failedResult.length > 0) {
      this.loggerService.error({
        message: 'Failed to send push notification to some users',
        details: failedResult.map((r) => ({
          phoneNumber: r.phoneNumber,
          error: r.result.isErr() ? r.result.error : null,
        })),
      })
    } else {
      this.loggerService.info({
        message: 'Successfully sent push notifications to all targeted users',
      })
    }

    return ok(
      conditions.type === 'PHONE_NUMBER'
        ? {
            success: phoneNumberWithTokens.map((p) => p.phoneNumber),
            failed: notFoundUser ?? [],
          }
        : undefined
    )
  }
}

export const NotificationRepositoryPlugin = new Elysia({
  name: 'NotificationRepositoryPlugin',
})
  .use([
    PrismaServicePlugin,
    CloudMessagingServicePlugin,
    ElysiaLoggerPlugin({ name: 'NotificationRepository' }),
  ])
  .decorate(({ prismaService, cloudMessagingService, loggerService }) => ({
    notificationRepository: new NotificationRepository(
      prismaService,
      cloudMessagingService,
      loggerService
    ),
  }))
