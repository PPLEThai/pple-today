import { PrismaService } from '@pple-today/api-common/services'
import { MiniAppInviteStatus, MiniAppTier } from '@pple-today/database/prisma'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { AppNotificationRepository } from './app-notification-repository'

const SINCE = new Date('2026-07-18T17:00:00.000Z')
const BODY = { audience: { type: 'APP_USERS', miniAppId: 'app-1' } }

const createPrismaService = () => {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    notificationApiKeyUsageLog: {
      count: vi.fn().mockResolvedValue(4),
      create: vi.fn().mockResolvedValue({ id: 'usage-log-id' }),
    },
  }

  return {
    prismaService: {
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
        delete: vi.fn().mockResolvedValue({ id: 'usage-log-id' }),
      },
      notificationApiKey: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: vi.fn(async (cb: (txClient: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService & {
      miniApp: { findUniqueOrThrow: ReturnType<typeof vi.fn> }
      notificationApiKeyUsageLog: { delete: ReturnType<typeof vi.fn> }
      notificationApiKey: { updateMany: ReturnType<typeof vi.fn> }
      $transaction: ReturnType<typeof vi.fn>
    },
    tx,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('AppNotificationRepository.getAudienceInput', () => {
  test('reads only ACCEPTED invites that are bound to an account', async () => {
    const { prismaService } = createPrismaService()
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
    const { prismaService } = createPrismaService()
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
    const { prismaService } = createPrismaService()
    prismaService.miniApp.findUniqueOrThrow = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('not found'), { code: 'P2025' }))
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.getAudienceInput('missing-app')

    expect(result.isErr()).toBe(true)
  })
})

describe('AppNotificationRepository.claimUsageUnderQuota', () => {
  test('locks the key row, counts usage in the window, and writes when under quota', async () => {
    const { prismaService, tx } = createPrismaService()
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.claimUsageUnderQuota('key-1', 10, SINCE, BODY)

    expect(prismaService.$transaction).toHaveBeenCalledOnce()
    expect(tx.$queryRaw).toHaveBeenCalledOnce()
    const [sqlChunks, lockedKeyId] = tx.$queryRaw.mock.calls[0]! as [TemplateStringsArray, string]
    expect(sqlChunks.join('')).toContain('FOR UPDATE')
    expect(sqlChunks.join('')).toContain('"NotificationApiKey"')
    expect(lockedKeyId).toBe('key-1')
    expect(tx.notificationApiKeyUsageLog.count).toHaveBeenCalledWith({
      where: { notificationApiKeyId: 'key-1', usedAt: { gte: SINCE } },
    })
    expect(tx.notificationApiKeyUsageLog.create).toHaveBeenCalledWith({
      data: { body: BODY, notificationApiKey: { connect: { id: 'key-1' } } },
    })
    expect(result._unsafeUnwrap()).toEqual({
      status: 'ok',
      usageLogId: 'usage-log-id',
      used: 5,
    })
  })

  test('refuses without writing when the key is already at the quota', async () => {
    const { prismaService, tx } = createPrismaService()
    tx.notificationApiKeyUsageLog.count.mockResolvedValue(10)
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.claimUsageUnderQuota('key-1', 10, SINCE, BODY)

    expect(result._unsafeUnwrap()).toEqual({ status: 'quota_exceeded', used: 10 })
    expect(tx.notificationApiKeyUsageLog.create).not.toHaveBeenCalled()
  })

  test('two concurrent claims at the last slot cannot both write when the key is locked', async () => {
    // `$transaction` itself does not serialise — only `$queryRaw` … `FOR UPDATE`
    // does, matching Postgres row locks. Count and create each yield so two
    // unlocked transactions can both read 9 and both insert; with the lock,
    // the second waits and then sees 10. Dropping the lock from the repository
    // makes this fail with used === 11.
    let used = 9
    let rowLock: Promise<void> = Promise.resolve()

    const createTx = () => {
      let releaseLock: (() => void) | undefined

      return {
        release: () => releaseLock?.(),
        $queryRaw: vi.fn(async (chunks: TemplateStringsArray) => {
          expect(chunks.join('')).toContain('FOR UPDATE')
          const previous = rowLock
          rowLock = new Promise<void>((resolve) => {
            releaseLock = resolve
          })
          await previous
        }),
        notificationApiKeyUsageLog: {
          count: vi.fn(async () => {
            await Promise.resolve()
            return used
          }),
          create: vi.fn(async () => {
            await Promise.resolve()
            used += 1
            return { id: `usage-log-${used}` }
          }),
        },
      }
    }

    const prismaService = {
      $transaction: vi.fn(async (cb: (txClient: ReturnType<typeof createTx>) => unknown) => {
        const txClient = createTx()
        try {
          return await cb(txClient)
        } finally {
          txClient.release()
        }
      }),
    } as unknown as PrismaService

    const repository = new AppNotificationRepository(prismaService)

    const results = await Promise.all([
      repository.claimUsageUnderQuota('key-1', 10, SINCE, BODY),
      repository.claimUsageUnderQuota('key-1', 10, SINCE, BODY),
    ])

    const statuses = results.map((result) => result._unsafeUnwrap().status)
    expect(statuses.filter((status) => status === 'ok')).toHaveLength(1)
    expect(statuses.filter((status) => status === 'quota_exceeded')).toHaveLength(1)
    expect(used).toBe(10)
  })
})

describe('AppNotificationRepository.releaseUsage', () => {
  test('deletes the claimed usage row', async () => {
    const { prismaService } = createPrismaService()
    const repository = new AppNotificationRepository(prismaService)

    await repository.releaseUsage('usage-log-id')

    expect(prismaService.notificationApiKeyUsageLog.delete).toHaveBeenCalledWith({
      where: { id: 'usage-log-id' },
    })
  })
})

describe('AppNotificationRepository.setDailyQuota', () => {
  test('updates only the app’s active keys and reports how many it touched', async () => {
    const { prismaService } = createPrismaService()
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
