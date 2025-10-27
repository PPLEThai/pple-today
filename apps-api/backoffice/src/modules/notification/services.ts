import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { NotificationRepository, NotificationRepositoryPlugin } from './repository'

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

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

  async testSendNotification(phoneNumber: string, title: string, message: string) {
    const deviceTokensResult = await this.notificationRepository.testSendNotificationToDevice(
      phoneNumber,
      title,
      message
    )

    if (deviceTokensResult.isErr()) {
      return mapRepositoryError(deviceTokensResult.error)
    }

    return ok()
  }
}

export const NotificationServicePlugin = new Elysia({ name: 'NotificationService' })
  .use([NotificationRepositoryPlugin])
  .decorate(({ notificationRepository }) => ({
    notificationService: new NotificationService(notificationRepository),
  }))
