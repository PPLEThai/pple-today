import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import Elysia from 'elysia'
import { ok } from 'neverthrow'

import { AdminNotificationRepository, AdminNotificationRepositoryPlugin } from './repository'

export class AdminNotificationService {
  constructor(private readonly adminNotificationRepository: AdminNotificationRepository) {}

  async listApiKeys(query: { limit?: number; page?: number }) {
    const limit = query.limit ?? 10
    const page = query.page ?? 1

    const apiKeyResult = await this.adminNotificationRepository.listApiKeys({ limit, page })

    if (apiKeyResult.isErr()) {
      return mapRepositoryError(apiKeyResult.error)
    }

    return ok(apiKeyResult.value)
  }

  async createApiKey(data: { name: string }) {
    const createApiKeyResult = await this.adminNotificationRepository.createApiKey(data)

    if (createApiKeyResult.isErr()) {
      return mapRepositoryError(createApiKeyResult.error)
    }

    return ok(createApiKeyResult.value)
  }

  async updateApiKey(id: string, data: { name?: string; active?: boolean }) {
    const updateApiKeyResult = await this.adminNotificationRepository.updateApiKey(id, data)

    if (updateApiKeyResult.isErr()) {
      return mapRepositoryError(updateApiKeyResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.NOTIFICATION_API_KEY_NOT_FOUND,
          message: 'The specified API key notification was not found',
        },
      })
    }

    return ok(updateApiKeyResult.value)
  }

  async deleteApiKey(id: string) {
    const deleteApiKeyResult = await this.adminNotificationRepository.deleteApiKey(id)

    if (deleteApiKeyResult.isErr()) {
      return mapRepositoryError(deleteApiKeyResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.NOTIFICATION_API_KEY_NOT_FOUND,
          message: 'The specified API key notification was not found',
        },
      })
    }

    return ok()
  }

  async rotateApiKey(id: string) {
    const rotateApiKeyResult = await this.adminNotificationRepository.rotateApiKey(id)

    if (rotateApiKeyResult.isErr()) {
      return mapRepositoryError(rotateApiKeyResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.NOTIFICATION_API_KEY_NOT_FOUND,
          message: 'The specified API key notification was not found',
        },
      })
    }

    return ok(rotateApiKeyResult.value)
  }
}

export const AdminNotificationServicePlugin = new Elysia({
  name: 'AdminNotificationService',
})
  .use(AdminNotificationRepositoryPlugin)
  .decorate(({ adminNotificationRepository }) => ({
    adminNotificationService: new AdminNotificationService(adminNotificationRepository),
  }))
