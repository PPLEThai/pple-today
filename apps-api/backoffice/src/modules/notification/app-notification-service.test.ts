import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { MiniAppTier } from '@pple-today/database/prisma'
import { err, ok } from 'neverthrow'
import { describe, expect, test, vi } from 'vitest'

import type { AppNotificationRepository } from './app-notification-repository'
import {
  AppBoundKey,
  AppNotificationContent,
  AppNotificationService,
} from './app-notification-service'
import type { NotificationRepository } from './repository'

const KEY_ID = 'notification-key-id'
const MINI_APP_ID = 'mini-app-id'
const OWNER = 'owner-sub'
const INVITEE = 'invitee-sub'
const STRANGER = 'stranger-sub'

// 11:30 on 2026-07-19 in Bangkok; the window resets at 17:00Z the same day.
const NOW = new Date('2026-07-19T04:30:00.000Z')
const NEXT_RESET = new Date('2026-07-19T17:00:00.000Z')

const CONTENT = { header: 'Canvassing today', message: 'Three streets left in Bang Rak' }

const appBoundKey = (overrides: Partial<AppBoundKey> = {}): AppBoundKey => ({
  id: KEY_ID,
  miniAppId: MINI_APP_ID,
  dailyQuota: 10,
  ...overrides,
})

/**
 * In-memory stand-in for `AppNotificationRepository`. Usage rows persist across
 * calls so the quota can be exercised as a *sequence* of sends — which is the
 * only way the rule that matters (the Nth send is refused) is actually tested.
 * The repository's own query shapes are asserted in its own test.
 */
const createFakeAppNotificationRepository = (
  overrides: {
    tier?: MiniAppTier
    ownerSub?: string | null
    appUserIds?: string[]
    acceptedInviteUserIds?: Set<string>
  } = {}
) => {
  const usage: { keyId: string; usedAt: Date; body: unknown }[] = []
  const audience = {
    tier: overrides.tier ?? MiniAppTier.LIVE,
    ownerSub: overrides.ownerSub === undefined ? OWNER : overrides.ownerSub,
    appUserIds: overrides.appUserIds ?? [OWNER, INVITEE, STRANGER],
    acceptedInviteUserIds: overrides.acceptedInviteUserIds ?? new Set<string>(),
  }

  return {
    usage,
    audience,
    getAudienceInput: vi.fn(async () => ok(audience)),
    countUsageSince: vi.fn(async (keyId: string, since: Date) =>
      ok(usage.filter((row) => row.keyId === keyId && row.usedAt >= since).length)
    ),
    recordUsage: vi.fn(async (keyId: string, body: unknown) => {
      usage.push({ keyId, usedAt: NOW, body })
      return ok({})
    }),
    setDailyQuota: vi.fn(async () => ok(1)),
  }
}

const createFakeNotificationRepository = () => ({
  sendNotificationToUser: vi.fn(
    async (
      _audience: { type: string; details?: string[] },
      _content: AppNotificationContent,
      _apiKeyId: string | undefined
    ) => ok(undefined)
  ),
})

const createService = (
  appNotificationRepository = createFakeAppNotificationRepository(),
  notificationRepository = createFakeNotificationRepository()
) => ({
  appNotificationRepository,
  notificationRepository,
  service: new AppNotificationService(
    appNotificationRepository as unknown as AppNotificationRepository,
    notificationRepository as unknown as NotificationRepository,
    () => NOW
  ),
})

describe('AppNotificationService.send', () => {
  describe('the key decides who may use this path at all', () => {
    test('a legacy key with no app binding is refused', async () => {
      const { service, notificationRepository } = createService()

      const result = await service.send(appBoundKey({ miniAppId: null }), CONTENT)

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_KEY_NOT_APP_BOUND)
      // Nothing was sent: there is no app to resolve an audience from.
      expect(notificationRepository.sendNotificationToUser).not.toHaveBeenCalled()
    })

    test('a binding to an app that no longer exists is an error, not an empty send', async () => {
      const repository = createFakeAppNotificationRepository()
      repository.getAudienceInput = vi.fn(async () => err({ code: 'RECORD_NOT_FOUND' }) as never)
      const { service } = createService(repository)

      const result = await service.send(appBoundKey(), CONTENT)

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_NOT_FOUND)
    })
  })

  describe('recipients are resolved server-side from the App User registry', () => {
    test('a Live app reaches its App Users, addressed by user id', async () => {
      const { service, notificationRepository } = createService()

      const result = await service.send(appBoundKey(), CONTENT)

      expect(result._unsafeUnwrap().recipientCount).toBe(3)
      const [audience, content, apiKeyId] =
        notificationRepository.sendNotificationToUser.mock.calls[0]
      expect(audience).toEqual({ type: 'USER_ID', details: [OWNER, INVITEE, STRANGER] })
      expect(content).toEqual(CONTENT)
      // The audience-bound path writes its own content-only usage log, so the
      // shared send path must not also meter this against the key.
      expect(apiKeyId).toBeUndefined()
    })

    test('a Beta app reaches only accepted invitees who have opened it', async () => {
      const repository = createFakeAppNotificationRepository({
        tier: MiniAppTier.BETA,
        appUserIds: [OWNER, INVITEE, STRANGER],
        acceptedInviteUserIds: new Set([INVITEE]),
      })
      const { service, notificationRepository } = createService(repository)

      const result = await service.send(appBoundKey(), CONTENT)

      expect(result._unsafeUnwrap().recipientCount).toBe(2)
      const [audience] = notificationRepository.sendNotificationToUser.mock.calls[0]
      expect(audience).toEqual({ type: 'USER_ID', details: [OWNER, INVITEE] })
    })

    test('narrowing the tier narrows the next send, with nothing to re-provision', async () => {
      const repository = createFakeAppNotificationRepository({
        acceptedInviteUserIds: new Set([INVITEE]),
      })
      const { service, notificationRepository } = createService(repository)

      await service.send(appBoundKey(), CONTENT)
      repository.audience.tier = MiniAppTier.DRAFT
      await service.send(appBoundKey(), CONTENT)

      const [firstAudience] = notificationRepository.sendNotificationToUser.mock.calls[0]
      const [secondAudience] = notificationRepository.sendNotificationToUser.mock.calls[1]
      expect(firstAudience).toEqual({ type: 'USER_ID', details: [OWNER, INVITEE, STRANGER] })
      expect(secondAudience).toEqual({ type: 'USER_ID', details: [OWNER] })
    })

    test('an app nobody has opened sends nothing but still costs a send', async () => {
      const repository = createFakeAppNotificationRepository({ appUserIds: [] })
      const { service, notificationRepository } = createService(repository)

      const result = await service.send(appBoundKey(), CONTENT)

      expect(result._unsafeUnwrap().recipientCount).toBe(0)
      // No recipients means no notification to create — but the request was
      // still made, so it is metered. Otherwise an app could poll for free.
      expect(notificationRepository.sendNotificationToUser).not.toHaveBeenCalled()
      expect(repository.usage).toHaveLength(1)
    })
  })

  describe('the daily quota', () => {
    test('is metered per send and reported as remaining budget', async () => {
      const { service } = createService(createFakeAppNotificationRepository())

      const first = await service.send(appBoundKey({ dailyQuota: 3 }), CONTENT)
      const second = await service.send(appBoundKey({ dailyQuota: 3 }), CONTENT)

      expect(first._unsafeUnwrap().remaining).toBe(2)
      expect(second._unsafeUnwrap().remaining).toBe(1)
    })

    test('refuses the send that would exceed it, with the budget attached', async () => {
      const repository = createFakeAppNotificationRepository()
      const { service, notificationRepository } = createService(repository)
      const key = appBoundKey({ dailyQuota: 2 })

      await service.send(key, CONTENT)
      await service.send(key, CONTENT)
      const refused = await service.send(key, CONTENT)

      expect(refused._unsafeUnwrapErr()).toMatchObject({
        code: InternalErrorCode.NOTIFICATION_QUOTA_EXCEEDED,
        data: {
          dailyQuota: 2,
          remaining: 0,
          resetAt: NEXT_RESET.toISOString(),
        },
      })
      // The refused send must not have gone out.
      expect(notificationRepository.sendNotificationToUser).toHaveBeenCalledTimes(2)
      expect(repository.usage).toHaveLength(2)
    })

    test('counts only sends inside the current window, so it resets daily', async () => {
      const repository = createFakeAppNotificationRepository()
      // Yesterday's sends exhausted the budget, but they fall outside today's
      // window, so today starts from zero.
      repository.usage.push(
        { keyId: KEY_ID, usedAt: new Date('2026-07-18T05:00:00.000Z'), body: {} },
        { keyId: KEY_ID, usedAt: new Date('2026-07-18T06:00:00.000Z'), body: {} }
      )
      const { service } = createService(repository)

      const result = await service.send(appBoundKey({ dailyQuota: 2 }), CONTENT)

      expect(result._unsafeUnwrap().remaining).toBe(1)
      const [, since] = repository.countUsageSince.mock.calls[0]
      expect(since).toEqual(new Date('2026-07-18T17:00:00.000Z'))
    })

    test('is metered per key, not across an app', async () => {
      const repository = createFakeAppNotificationRepository()
      const { service } = createService(repository)

      await service.send(appBoundKey({ id: 'key-a', dailyQuota: 1 }), CONTENT)
      const other = await service.send(appBoundKey({ id: 'key-b', dailyQuota: 1 }), CONTENT)

      expect(other.isOk()).toBe(true)
    })

    test('a failed send is not metered', async () => {
      const repository = createFakeAppNotificationRepository()
      const notificationRepository = createFakeNotificationRepository()
      notificationRepository.sendNotificationToUser = vi.fn(async () =>
        err({ code: InternalErrorCode.NOTIFICATION_SENT_FAILED, message: 'boom' })
      ) as never
      const { service } = createService(repository, notificationRepository)

      const result = await service.send(appBoundKey(), CONTENT)

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_SENT_FAILED)
      expect(repository.usage).toHaveLength(0)
    })
  })

  describe('the usage log', () => {
    test('records the content and the app, never the resolved recipients', async () => {
      const repository = createFakeAppNotificationRepository()
      const { service } = createService(repository)

      await service.send(appBoundKey(), CONTENT)

      // Stringified, matching how the raw-targeting path writes this column.
      expect(JSON.parse(repository.usage[0].body as string)).toEqual({
        audience: { type: 'APP_USERS', miniAppId: MINI_APP_ID },
        data: CONTENT,
      })
      expect(repository.usage[0].body).not.toContain(OWNER)
    })
  })
})

describe('AppNotificationService.setDailyQuota', () => {
  test("updates the app's key and reports how many keys it touched", async () => {
    const repository = createFakeAppNotificationRepository()
    const { service } = createService(repository)

    const result = await service.setDailyQuota(MINI_APP_ID, 5000)

    expect(result._unsafeUnwrap()).toEqual({ dailyQuota: 5000 })
    expect(repository.setDailyQuota).toHaveBeenCalledWith(MINI_APP_ID, 5000)
  })

  test('an app with no active key is a not-found, not a silent no-op', async () => {
    const repository = createFakeAppNotificationRepository()
    repository.setDailyQuota = vi.fn(async () => ok(0))
    const { service } = createService(repository)

    const result = await service.setDailyQuota(MINI_APP_ID, 5000)

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_API_KEY_NOT_FOUND)
  })
})
