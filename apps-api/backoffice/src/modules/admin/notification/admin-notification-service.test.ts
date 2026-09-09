import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { NotificationApiKeySource } from '@pple-today/database/prisma'
import { ok } from 'neverthrow'
import { describe, expect, test, vi } from 'vitest'

import { AdminNotificationService } from './admin-notification-service'
import type { AdminNotificationRepository } from './repository'

const createService = (source: NotificationApiKeySource = NotificationApiKeySource.ADMIN) => {
  const repository = {
    findApiKeySource: vi.fn(async () => ok({ source })),
    createApiKey: vi.fn(async () => ok({ id: 'key-1', apiKey: 'plaintext' })),
    updateApiKey: vi.fn(async () => ok({ id: 'key-1' })),
    deleteApiKey: vi.fn(async () => ok({ id: 'key-1' })),
    rotateApiKey: vi.fn(async () => ok({ apiKey: 'rotated' })),
  } as unknown as AdminNotificationRepository & {
    findApiKeySource: ReturnType<typeof vi.fn>
    updateApiKey: ReturnType<typeof vi.fn>
    deleteApiKey: ReturnType<typeof vi.fn>
    rotateApiKey: ReturnType<typeof vi.fn>
  }

  return { service: new AdminNotificationService(repository), repository }
}

describe('AdminNotificationService key provenance', () => {
  test('creating a key bound to a Builder App is allowed', async () => {
    // The point of the whole change: an admin binds their own key to a Builder
    // App so the notification wears that app's identity, while the key keeps the
    // raw-targeting reach the Builder's own key does not have.
    const { service, repository } = createService()

    const result = await service.createApiKey({
      name: 'Enhanced audience',
      miniAppId: 'builder-app',
    })

    expect(result.isOk()).toBe(true)
    expect(repository.createApiKey).toHaveBeenCalledWith({
      name: 'Enhanced audience',
      miniAppId: 'builder-app',
    })
    // Creating touches no existing key, so nothing to guard against.
    expect(repository.findApiKeySource).not.toHaveBeenCalled()
  })

  test.each([
    ['updateApiKey', (service: AdminNotificationService) => service.updateApiKey('key-1', {})],
    ['deleteApiKey', (service: AdminNotificationService) => service.deleteApiKey('key-1')],
    ['rotateApiKey', (service: AdminNotificationService) => service.rotateApiKey('key-1')],
  ])('%s refuses a key the provisioner owns, before touching it', async (name, call) => {
    const { service, repository } = createService(NotificationApiKeySource.PLATFORM)

    const result = await call(service)

    expect(result._unsafeUnwrapErr().code).toBe(
      InternalErrorCode.NOTIFICATION_API_KEY_PLATFORM_MANAGED
    )
    // Refused, not attempted-and-rolled-back: rotating a Builder's key would
    // break an integration this portal does not operate.
    expect(repository[name as 'updateApiKey']).not.toHaveBeenCalled()
  })

  test.each([
    ['updateApiKey', (service: AdminNotificationService) => service.updateApiKey('key-1', {})],
    ['deleteApiKey', (service: AdminNotificationService) => service.deleteApiKey('key-1')],
    ['rotateApiKey', (service: AdminNotificationService) => service.rotateApiKey('key-1')],
  ])('%s manages an admin key on the same app freely', async (name, call) => {
    // An admin key bound to a Builder App is still the admin's to manage; the
    // guard reads the key's provenance, never the app's.
    const { service, repository } = createService(NotificationApiKeySource.ADMIN)

    const result = await call(service)

    expect(result.isOk()).toBe(true)
    expect(repository[name as 'updateApiKey']).toHaveBeenCalled()
  })
})
