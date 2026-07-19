import { PrismaService } from '@pple-today/api-common/services'
import { MiniAppInviteStatus, MiniAppTier } from '@pple-today/database/prisma'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { AppNotificationRepository } from './app-notification-repository'

const createPrismaService = () =>
  ({
    miniApp: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        slug: 'canvassing',
        tier: MiniAppTier.BETA,
        ownerSub: 'owner-sub',
        appUsers: [{ userId: 'owner-sub' }, { userId: 'invitee-sub' }],
        invites: [{ userId: 'invitee-sub' }],
      }),
    },
    notificationApiKeyUsageLog: {
      count: vi.fn().mockResolvedValue(4),
      create: vi.fn().mockResolvedValue({ id: 'usage-log-id' }),
    },
    notificationApiKey: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  }) as unknown as PrismaService & {
    miniApp: { findUniqueOrThrow: ReturnType<typeof vi.fn> }
    notificationApiKeyUsageLog: {
      count: ReturnType<typeof vi.fn>
      create: ReturnType<typeof vi.fn>
    }
    notificationApiKey: { updateMany: ReturnType<typeof vi.fn> }
  }

afterEach(() => {
  vi.clearAllMocks()
})

describe('AppNotificationRepository.getAudienceInput', () => {
  test('reads only ACCEPTED invites that are bound to an account', async () => {
    const prismaService = createPrismaService()
    const repository = new AppNotificationRepository(prismaService)

    await repository.getAudienceInput('app-1')

    const [args] = prismaService.miniApp.findUniqueOrThrow.mock.calls[0]
    expect(args.where).toEqual({ id: 'app-1' })
    // A pending invite is not consent, and an accepted invite with no bound
    // userId cannot be matched to a recipient — both must be filtered in the
    // query rather than leaking into the audience.
    expect(args.select.invites.where).toEqual({
      status: MiniAppInviteStatus.ACCEPTED,
      userId: { not: null },
    })
  })

  test('shapes the row into the audience rule’s input', async () => {
    const prismaService = createPrismaService()
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.getAudienceInput('app-1')

    expect(result._unsafeUnwrap()).toEqual({
      slug: 'canvassing',
      tier: MiniAppTier.BETA,
      ownerSub: 'owner-sub',
      appUserIds: ['owner-sub', 'invitee-sub'],
      acceptedInviteUserIds: new Set(['invitee-sub']),
    })
  })

  test('a missing mini app is a repository error, not an empty audience', async () => {
    const prismaService = createPrismaService()
    prismaService.miniApp.findUniqueOrThrow = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('not found'), { code: 'P2025' }))
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.getAudienceInput('missing-app')

    expect(result.isErr()).toBe(true)
  })
})

describe('AppNotificationRepository.countUsageSince', () => {
  test('counts this key’s sends inside the window only', async () => {
    const prismaService = createPrismaService()
    const repository = new AppNotificationRepository(prismaService)
    const since = new Date('2026-07-18T17:00:00.000Z')

    const result = await repository.countUsageSince('key-1', since)

    expect(prismaService.notificationApiKeyUsageLog.count).toHaveBeenCalledWith({
      where: { notificationApiKeyId: 'key-1', usedAt: { gte: since } },
    })
    expect(result._unsafeUnwrap()).toBe(4)
  })
})

describe('AppNotificationRepository.recordUsage', () => {
  test('writes the given body against the key', async () => {
    const prismaService = createPrismaService()
    const repository = new AppNotificationRepository(prismaService)
    const body = { audience: { type: 'APP_USERS', miniAppId: 'app-1' } }

    await repository.recordUsage('key-1', body)

    expect(prismaService.notificationApiKeyUsageLog.create).toHaveBeenCalledWith({
      data: { body, notificationApiKey: { connect: { id: 'key-1' } } },
    })
  })
})

describe('AppNotificationRepository.setDailyQuota', () => {
  test('updates only the app’s active keys and reports how many it touched', async () => {
    const prismaService = createPrismaService()
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.setDailyQuota('app-1', 5000)

    // Scoped to `active`, so a retired app's deactivated key cannot be handed a
    // fresh budget behind the platform's back.
    expect(prismaService.notificationApiKey.updateMany).toHaveBeenCalledWith({
      where: { miniAppId: 'app-1', active: true },
      data: { dailyQuota: 5000 },
    })
    expect(result._unsafeUnwrap()).toBe(1)
  })
})
