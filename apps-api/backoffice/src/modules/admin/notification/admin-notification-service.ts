import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { NotificationApiKeySource } from '@pple-today/database/prisma'
import { err, ok } from 'neverthrow'

import type { AdminNotificationRepository } from './repository'

/**
 * Kept free of Elysia/config imports so the provenance guard can be unit-tested
 * without booting the app's config graph; the plugin wiring lives in
 * `services.ts`.
 */
export class AdminNotificationService {
  constructor(private readonly adminNotificationRepository: AdminNotificationRepository) {}

  async listApiKeys(query: { limit?: number; page?: number; miniAppId?: string }) {
    const limit = query.limit ?? 10
    const page = query.page ?? 1

    const apiKeyResult = await this.adminNotificationRepository.listApiKeys({
      limit,
      page,
      miniAppId: query.miniAppId,
    })

    if (apiKeyResult.isErr()) {
      return mapRepositoryError(apiKeyResult.error)
    }

    return ok(apiKeyResult.value)
  }

  /**
   * A key provisioned for a Builder App is the provisioner's to manage: the
   * Builder holds it and an integration we do not operate depends on it, so
   * rotating or deactivating it from here would break them silently. Admins may
   * still *add* their own key to the same app — that is the whole point of the
   * binding — and manage that one freely.
   *
   * Mirrors `AdminMiniAppService.checkNotPlatformManaged`, and for the same
   * reason: read the provenance first so a refusal explains itself instead of
   * surfacing as a not-found.
   */
  private async checkNotPlatformManaged(id: string) {
    const sourceResult = await this.adminNotificationRepository.findApiKeySource(id)

    if (sourceResult.isErr()) {
      return mapRepositoryError(sourceResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.NOTIFICATION_API_KEY_NOT_FOUND,
          message: 'The specified API key notification was not found',
        },
      })
    }

    if (sourceResult.value.source === NotificationApiKeySource.PLATFORM) {
      return err({
        code: InternalErrorCode.NOTIFICATION_API_KEY_PLATFORM_MANAGED,
        message:
          'This key was provisioned for a Builder App and is managed by the PPLE Platform Provisioner. Add a separate admin key to this app instead.',
      })
    }

    return ok(undefined)
  }

  async createApiKey(data: { name: string; miniAppId?: string }) {
    const createApiKeyResult = await this.adminNotificationRepository.createApiKey(data)

    if (createApiKeyResult.isErr()) {
      return mapRepositoryError(createApiKeyResult.error, {
        FOREIGN_KEY_CONSTRAINT_FAILED: {
          code: InternalErrorCode.MINI_APP_NOT_FOUND,
          message: 'The mini app to bind this key to was not found',
        },
      })
    }

    return ok(createApiKeyResult.value)
  }

  async updateApiKey(id: string, data: { name?: string; active?: boolean }) {
    const manageableResult = await this.checkNotPlatformManaged(id)
    if (manageableResult.isErr()) return err(manageableResult.error)

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
    const manageableResult = await this.checkNotPlatformManaged(id)
    if (manageableResult.isErr()) return err(manageableResult.error)

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
    const manageableResult = await this.checkNotPlatformManaged(id)
    if (manageableResult.isErr()) return err(manageableResult.error)

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
