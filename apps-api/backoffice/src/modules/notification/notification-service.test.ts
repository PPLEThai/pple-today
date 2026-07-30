import { MiniAppSource } from '@pple-today/database/prisma'
import { ok } from 'neverthrow'
import { describe, expect, test, vi } from 'vitest'

import { NotificationService } from './notification-service'
import type { NotificationRepository } from './repository'

const LEGACY_KEY = { id: 'legacy-key-id', miniApp: null, dailyQuota: 1000 }
const BOUND_KEY = {
  id: 'bound-key-id',
  miniApp: { id: 'mini-app-id', source: MiniAppSource.PLATFORM, name: 'Canvassing', icon: null },
  dailyQuota: 1000,
}
// The only *bound* key that reaches this path: `requireUnboundKey` turns a
// PLATFORM-bound one away at the controller.
const CENTRAL_TEAM_KEY = {
  id: 'central-team-key-id',
  miniApp: {
    id: 'election-app-id',
    source: MiniAppSource.ADMIN,
    name: 'เลือกตั้ง',
    icon: 'https://cdn.example/election.png',
  },
  dailyQuota: 1000,
}

const createService = (checkApiKeyResult: unknown = LEGACY_KEY) => {
  const notificationRepository = {
    checkApiKey: vi.fn(async () => ok(checkApiKeyResult)),
    sendNotificationToUser: vi.fn(
      async (
        _audience: { type: string; details?: unknown },
        _content: unknown,
        _options?: { apiKeyId?: string; app?: unknown; smsFallbackText?: string }
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
 * consulted — so these assert that a legacy key (no binding) still resolves and
 * still sends exactly as it did.
 */
describe('NotificationService.checkApiToken (legacy keys)', () => {
  test('resolves a legacy key and reports it as unbound', async () => {
    const { service } = createService()

    const result = await service.checkApiToken('plaintext-key')

    expect(result._unsafeUnwrap()).toEqual(LEGACY_KEY)
    // No binding is what admits this key to the raw-targeting path.
    expect(result._unsafeUnwrap()?.miniApp).toBeNull()
  })

  test('an unknown or deactivated key resolves to null, as before', async () => {
    const { service } = createService(null)

    expect((await service.checkApiToken('nope'))._unsafeUnwrap()).toBeNull()
  })

  test('surfaces the whole bound app, so callers can guard and attribute in one step', async () => {
    const { service } = createService(BOUND_KEY)

    // Not just the id: the guard needs `source` and the send path needs the
    // name and icon, all at the moment the key is authenticated.
    expect((await service.checkApiToken('plaintext-key'))._unsafeUnwrap()?.miniApp).toEqual(
      BOUND_KEY.miniApp
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

    const result = await service.sendExternalNotification(body, LEGACY_KEY)

    // Unchanged: the caller's own audience, and the key still meters the send.
    // A legacy key names no app, so the notification stays platform-branded.
    expect(notificationRepository.sendNotificationToUser).toHaveBeenCalledWith(
      body.audience,
      body.content,
      { apiKeyId: LEGACY_KEY.id, app: undefined, smsFallbackText: body.smsFallbackText }
    )
    expect(result._unsafeUnwrap()).toEqual({ success: ['+66812345678'], failed: [] })
  })

  test('a central-team key attributes its broadcast to its app', async () => {
    // Attribution follows the key, not the audience: a central-team app
    // broadcasting to everyone still puts its own name in the tray, even though
    // most recipients have never opened it. Branding communicates provenance,
    // and a central-team app is vetted.
    const { service, notificationRepository } = createService(CENTRAL_TEAM_KEY)

    await service.sendExternalNotification(
      { audience: { type: 'BROADCAST' }, content: { header: 'Hello', message: 'World' } },
      CENTRAL_TEAM_KEY
    )

    const [, , options] = notificationRepository.sendNotificationToUser.mock.calls[0]
    expect(options?.app).toEqual(CENTRAL_TEAM_KEY.miniApp)
  })

  test('still supports the other audience types unchanged', async () => {
    const { service, notificationRepository } = createService()

    for (const audience of [
      { type: 'BROADCAST' as const },
      { type: 'ROLE' as const, details: ['pple-ad:hq'] },
    ]) {
      await service.sendExternalNotification(
        { audience, content: { header: 'Hello', message: 'World' } },
        LEGACY_KEY
      )
    }

    expect(notificationRepository.sendNotificationToUser.mock.calls.map(([a]) => a)).toEqual([
      { type: 'BROADCAST' },
      { type: 'ROLE', details: ['pple-ad:hq'] },
    ])
  })
})
