import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { AppNotificationRepository } from './app-notification-repository'
import { AppNotificationService } from './app-notification-service'
import {
  CreateNewExternalNotificationBody,
  GetNotificationDetailsByIdResponse,
  ListHistoryNotificationResponse,
} from './models'
import { NotificationRepository, NotificationRepositoryPlugin } from './repository'

import { PrismaServicePlugin } from '../../plugins/prisma'

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  /**
   * Resolve a presented API key, or null when it is unknown or deactivated.
   *
   * Returns the whole record rather than just its id: a key's `miniAppId`
   * binding decides which send path it may use, so every caller has to see it
   * at the point it authenticates.
   */
  async checkApiToken(apiToken: string) {
    const isValid = await this.notificationRepository.checkApiKey(apiToken)

    if (isValid.isErr()) {
      return mapRepositoryError(isValid.error)
    }

    return ok(isValid.value)
  }

  async listNotifications(userId: string, cursor?: string, limit?: number) {
    const listResult = await this.notificationRepository.listNotifications(userId, cursor, limit)

    if (listResult.isErr()) {
      return mapRepositoryError(listResult.error)
    }

    const notifications: ListHistoryNotificationResponse['items'] =
      listResult.value.notifications.map(({ notification, isRead, createdAt }) => ({
        id: notification.id,
        title: notification.title,
        description: notification.message ?? undefined,
        image: notification.image ?? undefined,
        isRead,
        createdAt,
      }))

    return ok({
      items: notifications,
      meta: {
        cursor: {
          next: listResult.value.nextCursor,
          previous: listResult.value.previousCursor,
        },
      },
    })
  }

  async getNotificationDetailsById(userId: string, notificationId: string) {
    const getResult = await this.notificationRepository.getNotificationDetailsById(
      userId,
      notificationId
    )

    if (getResult.isErr()) {
      return mapRepositoryError(getResult.error)
    }

    const notification = getResult.value
    const notificationDetails = notification.notification

    const linkBypassFields =
      notificationDetails.linkBypassNotificationCenter != null
        ? { bypassNotificationCenter: notificationDetails.linkBypassNotificationCenter }
        : {}

    return ok({
      id: notificationDetails.id,
      content: {
        header: notificationDetails.title,
        message: notificationDetails.message ?? undefined,
        image: notificationDetails.image ?? undefined,
        actionButtonText:
          notificationDetails.linkType && notificationDetails.actionButtonText
            ? notificationDetails.actionButtonText
            : undefined,
        link: !notificationDetails.linkType
          ? undefined
          : notificationDetails.linkType === 'EXTERNAL_BROWSER' ||
              notificationDetails.linkType === 'MINI_APP'
            ? {
                type: notificationDetails.linkType,
                destination: notificationDetails.linkDestination!,
                ...linkBypassFields,
              }
            : {
                type: 'IN_APP_NAVIGATION',
                destination: {
                  inAppType: notificationDetails.linkInAppType!,
                  inAppId: notificationDetails.linkInAppId!,
                },
                ...linkBypassFields,
              },
      },
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    } satisfies GetNotificationDetailsByIdResponse)
  }

  async registerDeviceToken(userId: string, deviceToken: string) {
    const registerResult = await this.notificationRepository.registerDeviceToken(
      userId,
      deviceToken
    )

    if (registerResult.isErr()) {
      return mapRepositoryError(registerResult.error)
    }

    return ok()
  }

  async markAsRead(userId: string, notificationId: string) {
    const markResult = await this.notificationRepository.markAsRead(userId, notificationId)

    if (markResult.isErr()) {
      return mapRepositoryError(markResult.error)
    }

    return ok()
  }

  async markAllAsRead(userId: string) {
    const markResult = await this.notificationRepository.markAllAsRead(userId)

    if (markResult.isErr()) {
      return mapRepositoryError(markResult.error)
    }

    return ok()
  }

  async sendExternalNotification(data: CreateNewExternalNotificationBody, apiKeyId: string) {
    const sendResult = await this.notificationRepository.sendNotificationToUser(
      data.audience,
      data.content,
      apiKeyId,
      data.smsFallbackText
    )

    if (sendResult.isErr()) {
      return mapRepositoryError(sendResult.error)
    }

    return ok(sendResult.value)
  }

  async getUnreadNotificationCount(userId: string) {
    const countResult = await this.notificationRepository.getUnreadNotificationCount(userId)

    if (countResult.isErr()) {
      return mapRepositoryError(countResult.error)
    }

    return ok(countResult.value)
  }
}

export const NotificationServicePlugin = new Elysia({ name: 'NotificationService' })
  .use([NotificationRepositoryPlugin])
  .decorate(({ notificationRepository }) => ({
    notificationService: new NotificationService(notificationRepository),
  }))

export const AppNotificationServicePlugin = new Elysia({ name: 'AppNotificationService' })
  .use([PrismaServicePlugin, NotificationRepositoryPlugin])
  .decorate(({ prismaService, notificationRepository }) => ({
    appNotificationService: new AppNotificationService(
      new AppNotificationRepository(prismaService),
      notificationRepository
    ),
  }))
