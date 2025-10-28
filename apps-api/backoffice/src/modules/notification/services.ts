import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { CreateNewExternalNotificationBody } from './models'
import { NotificationRepository, NotificationRepositoryPlugin } from './repository'

export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async checkApiToken(apiToken: string) {
    const isValid = await this.notificationRepository.checkApiKey(apiToken)

    if (isValid.isErr()) {
      return mapRepositoryError(isValid.error)
    }

    return ok(isValid.value?.id)
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
      apiKeyId
    )

    if (sendResult.isErr()) {
      return mapRepositoryError(sendResult.error)
    }

    return ok(sendResult.value)
  }
}

export const NotificationServicePlugin = new Elysia({ name: 'NotificationService' })
  .use([NotificationRepositoryPlugin])
  .decorate(({ notificationRepository }) => ({
    notificationService: new NotificationService(notificationRepository),
  }))
