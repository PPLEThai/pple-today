import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { PrismaService } from '@pple-today/api-common/services'
import {
  err,
  exhaustiveGuard,
  fromRepositoryPromise,
  normalizeThaiPhoneNumber,
} from '@pple-today/api-common/utils'
import {
  AnnouncementStatus,
  HashTagStatus,
  NotificationInAppType,
  NotificationLinkType,
  PollStatus,
  PostStatus,
  Prisma,
  TopicStatus,
  UserStatus,
} from '@pple-today/database/prisma'
import crypto from 'crypto'
import Elysia from 'elysia'
import { ok } from 'neverthrow'
import * as R from 'remeda'

import { AppNotificationRepository } from './app-notification-repository'
import { CreateNewExternalNotificationBody } from './models'

/**
 * An audience whose recipients the platform has already resolved to user ids.
 *
 * Deliberately absent from `CreateNewExternalNotificationBody`, so it cannot be
 * supplied over the wire: it is how *audience-bound* sends address an app's App
 * Users, and letting a caller name user ids directly would be exactly the raw
 * targeting the binding exists to prevent.
 */
export interface ResolvedUserAudience {
  type: 'USER_ID'
  details: string[]
}

/** Every audience the send path understands — public ones plus the internal one. */
export type NotificationAudience =
  | CreateNewExternalNotificationBody['audience']
  | ResolvedUserAudience

import { CloudMessagingService, CloudMessagingServicePlugin } from '../../plugins/cloud-messaging'
import { ElysiaLoggerPlugin } from '../../plugins/log'
import { PrismaServicePlugin } from '../../plugins/prisma'
import { SmsService, SmsServicePlugin } from '../../plugins/sms'

export class NotificationRepository {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cloudMessagingService: CloudMessagingService,
    private readonly smsService: SmsService,
    private readonly loggerService: ElysiaLoggerInstance
  ) {}

  private async checkValidInAppType(inAppType: NotificationInAppType, inAppId: string) {
    switch (inAppType) {
      case NotificationInAppType.POST:
        await this.prismaService.post.findUniqueOrThrow({
          where: { feedItemId: inAppId, status: PostStatus.PUBLISHED },
        })
        return true
      case NotificationInAppType.POLL:
        await this.prismaService.poll.findUniqueOrThrow({
          where: { feedItemId: inAppId, status: PollStatus.PUBLISHED },
        })
        return true
      case NotificationInAppType.TOPIC:
        await this.prismaService.topic.findUniqueOrThrow({
          where: { id: inAppId, status: TopicStatus.PUBLISHED },
        })
        return true
      case NotificationInAppType.ANNOUNCEMENT:
        await this.prismaService.announcement.findUniqueOrThrow({
          where: { feedItemId: inAppId, status: AnnouncementStatus.PUBLISHED },
        })
        return true
      case NotificationInAppType.ELECTION:
        await this.prismaService.election.findUniqueOrThrow({
          where: {
            id: inAppId,
            isCancelled: false,
            publishDate: { lte: new Date() },
          },
        })
        return true
      case NotificationInAppType.HASHTAG:
        await this.prismaService.hashTag.findUniqueOrThrow({
          where: { id: inAppId, status: HashTagStatus.PUBLISHED },
        })
        return true
      case NotificationInAppType.USER:
        await this.prismaService.user.findUniqueOrThrow({
          where: { id: inAppId, status: UserStatus.ACTIVE },
        })
        return true
      case NotificationInAppType.ELECTION_VOTE:
        await this.prismaService.election.findUniqueOrThrow({
          where: {
            id: inAppId,
            isCancelled: false,
            publishDate: { lte: new Date() },
          },
        })
        return true
      case NotificationInAppType.OFFICIAL:
      case NotificationInAppType.ACTIVITY:
      case NotificationInAppType.ANNOUNCEMENT_LIST:
      case NotificationInAppType.NOTIFICATION_LIST:
      case NotificationInAppType.SEARCH:
      case NotificationInAppType.PROFILE:
      case NotificationInAppType.MY_ACTIVITIES:
      case NotificationInAppType.RECENT_ACTIVITIES:
      case NotificationInAppType.FOLLOW:
      case NotificationInAppType.PARTICIPATION:
      case NotificationInAppType.TOPIC_SUGGESTION:
      case NotificationInAppType.USER_SUGGESTION:
        return true
      default:
        exhaustiveGuard(inAppType)
    }
  }

  private getFilterConditions(audience: NotificationAudience): Prisma.UserFindManyArgs['where'] {
    switch (audience.type) {
      case 'USER_ID':
        return {
          id: {
            in: audience.details,
          },
        }
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

  /**
   * Resolve a presented key to its record, or null when it is unknown or
   * deactivated (retiring an app deactivates its key, which is what stops a
   * retired Builder App from notifying anyone).
   *
   * Returns the app binding and the daily quota alongside the id: `miniAppId`
   * decides *which* send path the key may use at all, so the caller needs it at
   * the same moment it learns the key is valid.
   */
  async checkApiKey(apiKey: string) {
    return fromRepositoryPromise(
      this.prismaService.notificationApiKey.findUnique({
        where: {
          apiKey: crypto.hash('sha256', apiKey),
          active: true,
        },
        select: {
          id: true,
          miniAppId: true,
          dailyQuota: true,
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

  /**
   * @param apiKeyId The notification API key this send is billed to, or
   *                 `undefined` for platform-internal sends that hold no key.
   */
  async sendNotificationToUser(
    conditions: NotificationAudience,
    data: CreateNewExternalNotificationBody['content'],
    apiKeyId: string | undefined,
    smsFallbackText?: string
  ) {
    const audience: NotificationAudience =
      conditions.type === 'PHONE_NUMBER'
        ? {
            type: 'PHONE_NUMBER',
            details: conditions.details.map(normalizeThaiPhoneNumber),
          }
        : conditions

    if (data.link?.bypassNotificationCenter === true) {
      if (data.link.type === NotificationLinkType.EXTERNAL_BROWSER) {
        return err({
          code: InternalErrorCode.NOTIFICATION_INVALID_BYPASS,
          message: 'bypassNotificationCenter cannot be used with EXTERNAL_BROWSER link type.',
        })
      }
    }

    if (data.link?.type === NotificationLinkType.IN_APP_NAVIGATION) {
      const checkResult = await fromRepositoryPromise(
        this.checkValidInAppType(data.link.destination.inAppType, data.link.destination.inAppId)
      )

      if (checkResult.isErr()) {
        if (checkResult.error.code === 'RECORD_NOT_FOUND') {
          return err({
            code: InternalErrorCode.NOTIFICATION_INVALID_IN_APP_NAVIGATION,
            message: `The in-app link destination with type ${data.link.destination.inAppType} and ID ${data.link.destination.inAppId} is invalid.`,
          })
        }
        return err(checkResult.error)
      }
    }

    const linkNavigation = !data.link
      ? undefined
      : data.link?.type === NotificationLinkType.IN_APP_NAVIGATION
        ? {
            linkType: data.link.type,
            linkInAppType: data.link.destination.inAppType,
            linkInAppId: data.link.destination.inAppId,
          }
        : {
            linkType: data.link.type,
            linkDestination: data.link.destination,
          }

    const createResult = await fromRepositoryPromise(async () => {
      // The usage log meters *API key* traffic. Platform-internal sends (an
      // invite delivered on the Builder's behalf) hold no key, so there is
      // nothing to meter and the log is skipped rather than faked.
      const usageLogWrites = apiKeyId
        ? [
            this.prismaService.notificationApiKeyUsageLog.create({
              data: {
                body: JSON.stringify({ audience, data }),
                notificationApiKey: {
                  connect: {
                    id: apiKeyId,
                  },
                },
              },
            }),
          ]
        : []

      const [newNotification] = await this.prismaService.$transaction([
        this.prismaService.notification.create({
          data: {
            ...linkNavigation,
            linkBypassNotificationCenter: data.link?.bypassNotificationCenter ?? null,
            title: data.header,
            message: data.message,
            image: data.image,
            actionButtonText: linkNavigation ? data?.actionButtonText : undefined,

            isBroadcast: audience.type === 'BROADCAST' ? true : false,
            districts: audience.type === 'ADDRESS' ? audience.details.districts : undefined,
            provinces: audience.type === 'ADDRESS' ? audience.details.provinces : undefined,
            roles: audience.type === 'ROLE' ? audience.details : undefined,
            phoneNumbers:
              audience.type === 'PHONE_NUMBER'
                ? {
                    createMany: {
                      data: audience.details?.map((phoneNumber) => ({ phoneNumber })) || [],
                    },
                  }
                : undefined,
          },
        }),
        ...usageLogWrites,
      ])

      const whereConditions = this.getFilterConditions(audience)

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
      audience.type === 'PHONE_NUMBER'
        ? R.difference(
            audience.details,
            phoneNumberWithTokens.map((p) => p.phoneNumber)
          )
        : undefined
    const emptyTokens = phoneNumberWithTokens.filter((p) => p.token.length === 0)
    const nonEmptyTokens = phoneNumberWithTokens.filter((p) => p.token.length > 0)

    const shouldBypass =
      data.link?.bypassNotificationCenter === true &&
      (data.link.type === 'MINI_APP' || data.link.type === 'IN_APP_NAVIGATION')

    const notificationDetails = {
      title: data.header,
      message: data.message,
      image: data.image,
      link: shouldBypass
        ? data.link
        : {
            type: 'IN_APP_NAVIGATION' as const,
            destination: {
              inAppType: 'NOTIFICATION' as const,
              inAppId: newNotification.id,
            },
          },
      notificationId: newNotification.id,
    }

    this.loggerService.info({
      message: 'Attempt sending push notification to user',
      details: {
        totalUsers: phoneNumberWithTokens.length,
        successfulDeliveries: nonEmptyTokens.length,
        failedDeliveries: emptyTokens.length,
        nonExisted: notFoundUser?.length || 0,
        notification: notificationDetails,
      },
    })

    const notificationResult = await Promise.all(
      nonEmptyTokens.map(async (p) => {
        return {
          phoneNumber: p.phoneNumber,
          result: await this.cloudMessagingService.sendNotifications(p.token, notificationDetails),
        }
      })
    )

    const failedResult = R.pipe(
      notificationResult,
      R.filter((r) => r.result.isErr())
    )

    if (failedResult.length > 0) {
      const failedTokens = R.pipe(
        failedResult,
        R.flatMap((res) => {
          const error = res.result._unsafeUnwrapErr()

          if (Array.isArray(error)) {
            return R.map(error, (e) => e.token)
          }

          return []
        }),
        R.filter((t) => t !== undefined)
      )

      R.pipe(
        failedResult,
        R.forEach(({ phoneNumber, result }) => {
          this.loggerService.error({
            message: 'Failed to send push notification',
            phoneNumber,
            details: result._unsafeUnwrapErr(),
          })
        })
      )

      const clearNotificationResult = await fromRepositoryPromise(
        this.prismaService.userNotificationToken.deleteMany({
          where: {
            token: {
              in: failedTokens,
            },
          },
        })
      )

      if (clearNotificationResult.isErr()) {
        this.loggerService.error({
          message: 'Failed to clear invalid notification tokens',
          details: clearNotificationResult.error,
        })
        return err(clearNotificationResult.error)
      }
    } else {
      this.loggerService.info({
        message: 'Successfully sent push notifications to all targeted users',
      })
    }

    const smsFallbackPhoneNumbers =
      audience.type === 'PHONE_NUMBER'
        ? [...emptyTokens.map((p) => p.phoneNumber), ...(notFoundUser ?? [])]
        : []

    if (smsFallbackText && smsFallbackPhoneNumbers.length > 0) {
      this.loggerService.info({
        message: 'Sending SMS fallback to users without push notification tokens',
        details: { count: smsFallbackPhoneNumbers.length },
      })

      await Promise.all(
        smsFallbackPhoneNumbers.map(async (phoneNumber) => {
          const smsResult = await this.smsService.sendSms(phoneNumber, smsFallbackText)
          if (smsResult.isErr()) {
            this.loggerService.error({
              message: 'Failed to send SMS fallback',
              phoneNumber,
              details: smsResult.error,
            })
          }
        })
      )
    }

    return ok(
      audience.type === 'PHONE_NUMBER'
        ? {
            success: phoneNumberWithTokens.map((p) => p.phoneNumber),
            failed: notFoundUser ?? [],
          }
        : undefined
    )
  }

  async getUnreadNotificationCount(userId: string) {
    return fromRepositoryPromise(
      this.prismaService.userNotification.count({
        where: {
          userId,
          isRead: false,
        },
      })
    )
  }
}

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
