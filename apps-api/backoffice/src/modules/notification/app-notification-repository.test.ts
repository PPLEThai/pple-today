import { PrismaService } from '@pple-today/api-common/services'
import { MiniAppInviteStatus, MiniAppSource, MiniAppTier } from '@pple-today/database/prisma'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { AppNotificationRepository } from './app-notification-repository'

const SINCE = new Date('2026-07-18T17:00:00.000Z')
const BODY = { audience: { type: 'APP_USERS', miniAppId: 'app-1' } }

const claim = (
  overrides: Partial<Parameters<AppNotificationRepository['claimUsage']>[0]> = {}
) => ({
  notificationApiKeyId: 'key-1',
  dailyQuota: 10,
  since: SINCE,
  units: 1,
  body: BODY,
  ...overrides,
})

const createPrismaService = () => {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    notificationApiKeyUsageLog: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { units: 4 } }),
      findUnique: vi.fn().mockResolvedValue(null),
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
      miniAppUser: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ userId: 'invitee-sub', user: { phoneNumber: '+66812345678' } }]),
      },
      notificationApiKeyUsageLog: {
        delete: vi.fn().mockResolvedValue({ id: 'usage-log-id' }),
        aggregate: vi.fn().mockResolvedValue({ _sum: { units: 3 } }),
      },
      notificationApiKey: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirst: vi.fn().mockResolvedValue({
          id: 'key-1',
          dailyQuota: 1000,
          miniApp: { source: MiniAppSource.PLATFORM },
        }),
      },
      $transaction: vi.fn(async (cb: (txClient: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService & {
      miniApp: { findUniqueOrThrow: ReturnType<typeof vi.fn> }
      miniAppUser: { findMany: ReturnType<typeof vi.fn> }
      notificationApiKeyUsageLog: {
        delete: ReturnType<typeof vi.fn>
        aggregate: ReturnType<typeof vi.fn>
      }
      notificationApiKey: {
        updateMany: ReturnType<typeof vi.fn>
        findFirst: ReturnType<typeof vi.fn>
      }
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

describe('AppNotificationRepository.getAppUserSubsByPhone', () => {
  test('resolves numbers only within the app’s own App Users', async () => {
    const { prismaService } = createPrismaService()
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.getAppUserSubsByPhone('app-1', ['+66812345678'])

    // Scoped through MiniAppUser, never asked of the directory at large: a
    // number belonging to nobody in this app must come back as nothing, not as
    // "exists but out of reach".
    expect(prismaService.miniAppUser.findMany).toHaveBeenCalledWith({
      where: { miniAppId: 'app-1', user: { phoneNumber: { in: ['+66812345678'] } } },
      select: { userId: true, user: { select: { phoneNumber: true } } },
    })
    expect(result._unsafeUnwrap()).toEqual(new Map([['+66812345678', 'invitee-sub']]))
  })

  test('asks nothing when no entry named a phone', async () => {
    const { prismaService } = createPrismaService()
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.getAppUserSubsByPhone('app-1', [])

    expect(prismaService.miniAppUser.findMany).not.toHaveBeenCalled()
    expect(result._unsafeUnwrap().size).toBe(0)
  })
})

describe('AppNotificationRepository.claimUsage', () => {
  test('locks the key row, sums usage in the window, and writes when under quota', async () => {
    const { prismaService, tx } = createPrismaService()
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.claimUsage(claim({ units: 3 }))

    expect(prismaService.$transaction).toHaveBeenCalledOnce()
    expect(tx.$queryRaw).toHaveBeenCalledOnce()
    const [sqlChunks, lockedKeyId] = tx.$queryRaw.mock.calls[0]! as [TemplateStringsArray, string]
    expect(sqlChunks.join('')).toContain('FOR UPDATE')
    expect(sqlChunks.join('')).toContain('"NotificationApiKey"')
    expect(lockedKeyId).toBe('key-1')
    // Deliveries, not calls: the budget is a SUM over `units`.
    expect(tx.notificationApiKeyUsageLog.aggregate).toHaveBeenCalledWith({
      where: { notificationApiKeyId: 'key-1', usedAt: { gte: SINCE } },
      _sum: { units: true },
    })
    expect(tx.notificationApiKeyUsageLog.create).toHaveBeenCalledWith({
      data: {
        body: BODY,
        units: 3,
        idempotencyKey: undefined,
        notificationApiKey: { connect: { id: 'key-1' } },
      },
    })
    expect(result._unsafeUnwrap()).toEqual({
      status: 'ok',
      usageLogId: 'usage-log-id',
      used: 7,
    })
  })

  test('an empty window sums to zero spent rather than to unknown', async () => {
    const { prismaService, tx } = createPrismaService()
    tx.notificationApiKeyUsageLog.aggregate.mockResolvedValue({ _sum: { units: null } })
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.claimUsage(claim({ units: 2 }))

    expect(result._unsafeUnwrap()).toEqual({
      status: 'ok',
      usageLogId: 'usage-log-id',
      used: 2,
    })
  })

  test('refuses the whole call when its units would not fit, without writing', async () => {
    // All-or-nothing: a call trimmed to fit is a message the caller believes it
    // sent to everyone it named, and retrying it would double-notify the rest.
    const { prismaService, tx } = createPrismaService()
    tx.notificationApiKeyUsageLog.aggregate.mockResolvedValue({ _sum: { units: 8 } })
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.claimUsage(claim({ units: 3 }))

    expect(result._unsafeUnwrap()).toEqual({ status: 'quota_exceeded', used: 8 })
    expect(tx.notificationApiKeyUsageLog.create).not.toHaveBeenCalled()
  })

  test('a claim that exactly fills the budget is allowed', async () => {
    const { prismaService, tx } = createPrismaService()
    tx.notificationApiKeyUsageLog.aggregate.mockResolvedValue({ _sum: { units: 8 } })
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.claimUsage(claim({ units: 2 }))

    expect(result._unsafeUnwrap()).toMatchObject({ status: 'ok', used: 10 })
  })

  test('a null quota records the call without ever refusing it', async () => {
    // An unmetered key still leaves the audit trail — the platform cannot log
    // this send itself — it is simply never held to a budget.
    const { prismaService, tx } = createPrismaService()
    tx.notificationApiKeyUsageLog.aggregate.mockResolvedValue({ _sum: { units: 9_000 } })
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.claimUsage(claim({ dailyQuota: null, units: 4_000 }))

    expect(result._unsafeUnwrap()).toMatchObject({ status: 'ok' })
    expect(tx.notificationApiKeyUsageLog.create).toHaveBeenCalled()
  })

  describe('the idempotency key', () => {
    test('is looked up under the same lock, before anything is spent', async () => {
      const { prismaService, tx } = createPrismaService()
      const repository = new AppNotificationRepository(prismaService)

      await repository.claimUsage(claim({ idempotencyKey: 'retry-1' }))

      expect(tx.notificationApiKeyUsageLog.findUnique).toHaveBeenCalledWith({
        where: {
          notificationApiKeyId_idempotencyKey: {
            notificationApiKeyId: 'key-1',
            idempotencyKey: 'retry-1',
          },
        },
        select: { id: true, body: true },
      })
      expect(tx.notificationApiKeyUsageLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ idempotencyKey: 'retry-1' }) })
      )
    })

    test('answers a repeat from the stored row instead of charging it again', async () => {
      const { prismaService, tx } = createPrismaService()
      tx.notificationApiKeyUsageLog.findUnique.mockResolvedValue({
        id: 'usage-log-id',
        body: '{"result":{"recipientCount":1}}',
      })
      const repository = new AppNotificationRepository(prismaService)

      const result = await repository.claimUsage(claim({ idempotencyKey: 'retry-1' }))

      expect(result._unsafeUnwrap()).toEqual({
        status: 'replayed',
        usageLogId: 'usage-log-id',
        body: '{"result":{"recipientCount":1}}',
        // The original charge is already in the window's sum, so the caller's
        // remaining budget reads the same on a retry as on the first attempt.
        used: 4,
      })
      expect(tx.notificationApiKeyUsageLog.create).not.toHaveBeenCalled()
    })

    test('is not looked up at all when the call supplied none', async () => {
      const { prismaService, tx } = createPrismaService()
      const repository = new AppNotificationRepository(prismaService)

      await repository.claimUsage(claim())

      // A null idempotencyKey is not a key to match on — many rows per key carry
      // one, and matching them to each other would replay unrelated calls.
      expect(tx.notificationApiKeyUsageLog.findUnique).not.toHaveBeenCalled()
    })
  })

  test('two concurrent claims at the last slot cannot both write when the key is locked', async () => {
    // `$transaction` itself does not serialise — only `$queryRaw` … `FOR UPDATE`
    // does, matching Postgres row locks. Sum and create each yield so two
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
          findUnique: vi.fn(async () => null),
          aggregate: vi.fn(async () => {
            await Promise.resolve()
            return { _sum: { units: used } }
          }),
          create: vi.fn(async ({ data }: { data: { units: number } }) => {
            await Promise.resolve()
            used += data.units
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
      repository.claimUsage(claim()),
      repository.claimUsage(claim()),
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

describe('AppNotificationRepository.getUsageSince', () => {
  test('sums deliveries for the app’s active key since the window start', async () => {
    const { prismaService } = createPrismaService()
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.getUsageSince('app-1', SINCE)

    // Same active-key scope as setDailyQuota — a retired/deactivated key is not
    // the meter the Console should read. The budget and the binding are selected
    // with it, because a count nobody can judge is half an answer.
    expect(prismaService.notificationApiKey.findFirst).toHaveBeenCalledWith({
      where: { miniAppId: 'app-1', active: true },
      select: { id: true, dailyQuota: true, miniApp: { select: { source: true } } },
    })
    // The same SUM the claim path enforces against, so the Console tile and a
    // 429 cannot disagree about what has been spent today.
    expect(prismaService.notificationApiKeyUsageLog.aggregate).toHaveBeenCalledWith({
      where: { notificationApiKeyId: 'key-1', usedAt: { gte: SINCE } },
      _sum: { units: true },
    })
    expect(result._unsafeUnwrap()).toEqual({
      sent: 3,
      dailyQuota: 1000,
      miniApp: { source: MiniAppSource.PLATFORM },
    })
  })

  test('an app that has sent nothing today reports zero rather than nothing', async () => {
    const { prismaService } = createPrismaService()
    prismaService.notificationApiKeyUsageLog.aggregate.mockResolvedValue({ _sum: { units: null } })
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.getUsageSince('app-1', SINCE)

    expect(result._unsafeUnwrap()).toMatchObject({ sent: 0 })
  })

  test('an app with no active key reports null, not zero sends', async () => {
    const { prismaService } = createPrismaService()
    prismaService.notificationApiKey.findFirst = vi.fn().mockResolvedValue(null)
    const repository = new AppNotificationRepository(prismaService)

    const result = await repository.getUsageSince('retired-app', SINCE)

    expect(result._unsafeUnwrap()).toBeNull()
    expect(prismaService.notificationApiKeyUsageLog.aggregate).not.toHaveBeenCalled()
  })
})
