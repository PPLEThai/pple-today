import { ok } from 'neverthrow'
import { describe, expect, test, vi } from 'vitest'

import { NotificationService } from './notification-service'
import type { NotificationRepository } from './repository'

const LEGACY_KEY = { id: 'legacy-key-id', miniAppId: null, dailyQuota: 1000 }
const BOUND_KEY = { id: 'bound-key-id', miniAppId: 'mini-app-id', dailyQuota: 1000 }

const createService = (checkApiKeyResult: unknown = LEGACY_KEY) => {
  const notificationRepository = {
    checkApiKey: vi.fn(async () => ok(checkApiKeyResult)),
    sendNotificationToUser: vi.fn(
      async (
        _audience: { type: string; details?: unknown },
        _content: unknown,
        _apiKeyId: string | undefined,
        _smsFallbackText?: string
      ) => ok({ success: ['+66812345678'], failed: [] })
    ),
  }

  return {
    notificationRepository,
    service: new NotificationService(notificationRepository as unknown as NotificationRepository),
  }
}

/**
 * Regression cover for the pre-existing central-team send path. Audience-bound
 * notifications changed two things underneath it — `checkApiToken` now returns
 * the whole key record rather than just its id, and the key's binding is
 * consulted — so these assert that a legacy key (miniAppId = null) still
 * resolves and still sends exactly as it did.
 */
describe('NotificationService.checkApiToken (legacy keys)', () => {
  test('resolves a legacy key and reports it as unbound', async () => {
    const { service } = createService()

    const result = await service.checkApiToken('plaintext-key')

    expect(result._unsafeUnwrap()).toEqual(LEGACY_KEY)
    // Null binding is what admits this key to the raw-targeting path.
    expect(result._unsafeUnwrap()?.miniAppId).toBeNull()
  })

  test('an unknown or deactivated key resolves to null, as before', async () => {
    const { service } = createService(null)

    expect((await service.checkApiToken('nope'))._unsafeUnwrap()).toBeNull()
  })

  test('surfaces the binding for a bound key, so callers can refuse it', async () => {
    const { service } = createService(BOUND_KEY)

    expect((await service.checkApiToken('plaintext-key'))._unsafeUnwrap()?.miniAppId).toBe(
      'mini-app-id'
    )
  })
})

describe('NotificationService.sendExternalNotification (legacy behaviour)', () => {
  test('passes raw phone targeting straight through, metered against the key', async () => {
    const { service, notificationRepository } = createService()
    const body = {
      audience: { type: 'PHONE_NUMBER' as const, details: ['+66812345678'] },
      content: { header: 'Hello', message: 'World' },
      smsFallbackText: 'Hello World',
    }

    const result = await service.sendExternalNotification(body, LEGACY_KEY.id)

    // Unchanged: the caller's own audience, and the key still meters the send.
    expect(notificationRepository.sendNotificationToUser).toHaveBeenCalledWith(
      body.audience,
      body.content,
      LEGACY_KEY.id,
      body.smsFallbackText
    )
    expect(result._unsafeUnwrap()).toEqual({ success: ['+66812345678'], failed: [] })
  })

  test('still supports the other audience types unchanged', async () => {
    const { service, notificationRepository } = createService()

    for (const audience of [
      { type: 'BROADCAST' as const },
      { type: 'ROLE' as const, details: ['pple-ad:hq'] },
    ]) {
      await service.sendExternalNotification(
        { audience, content: { header: 'Hello', message: 'World' } },
        LEGACY_KEY.id
      )
    }

    expect(notificationRepository.sendNotificationToUser.mock.calls.map(([a]) => a)).toEqual([
      { type: 'BROADCAST' },
      { type: 'ROLE', details: ['pple-ad:hq'] },
    ])
  })
})
