import { mapRepositoryError } from '@pple-today/api-common/utils'
import type { NotificationTokenPlatform } from '@pple-today/database/prisma'
import { ok } from 'neverthrow'

import type { BoundApp } from './key-binding'
import type {
  CreateNewExternalNotificationBody,
  GetNotificationDetailsByIdResponse,
  ListHistoryNotificationResponse,
} from './models'
import type { NotificationRepository } from './repository'

/**
 * The sending app as the client renders it. A notification with no app is PPLE
 * Today's own and keeps the platform bell, so `undefined` is the answer rather
 * than a placeholder name.
 */
const toSenderApp = (miniApp: { name: string; icon: string | null } | null) =>
  miniApp ? { name: miniApp.name, iconUrl: miniApp.icon ?? undefined } : undefined

/**
 * The central-team notification surface: history, read state, device tokens and
 * the raw-targeting external send.
 *
 * Kept free of Elysia/config imports so it can be unit-tested without booting
 * the app's config graph; the plugin wiring lives in `services.ts`. (Audience-
 * bound sends for Builder Apps live in `AppNotificationService` instead.)
 */
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  /**
   * Resolve a presented API key, or null when it is unknown or deactivated.
   *
   * Returns the whole record rather than just its id: the app a key is bound to
   * decides which send path it may use, whether it is metered, and whose name
   * and icon the notification carries — so every caller has to see it at the
   * point it authenticates.
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
        app: toSenderApp(notification.miniApp),
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
      app: toSenderApp(notificationDetails.miniApp),
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

  async registerDeviceToken(
    userId: string,
    deviceToken: string,
    device: { platform?: NotificationTokenPlatform; supportsAppBranding?: boolean } = {}
  ) {
    const registerResult = await this.notificationRepository.registerDeviceToken(
      userId,
      deviceToken,
      device
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

  /**
   * @param key The resolved key this send is metered against, and whose bound
   *            app (if any) the notification is attributed to. A legacy unbound
   *            key attributes to nobody, exactly as before.
   */
  async sendExternalNotification(
    data: CreateNewExternalNotificationBody,
    key: { id: string; miniApp: BoundApp | null }
  ) {
    const sendResult = await this.notificationRepository.sendNotificationToUser(
      data.audience,
      data.content,
      {
        apiKeyId: key.id,
        app: key.miniApp ?? undefined,
        smsFallbackText: data.smsFallbackText,
      }
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
