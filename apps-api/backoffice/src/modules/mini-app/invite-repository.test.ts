import { PrismaService } from '@pple-today/api-common/services'
import { MiniAppInviteStatus } from '@pple-today/database/prisma'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { MiniAppInviteRepository } from './invite-repository'

const createPrismaService = () => {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    miniAppInvite: {
      count: vi.fn().mockResolvedValue(0),
      upsert: vi.fn().mockResolvedValue({
        miniAppId: 'app-1',
        phoneNumber: '+66812345678',
        status: MiniAppInviteStatus.PENDING,
      }),
    },
  }

  return {
    prismaService: {
      miniAppInvite: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn().mockResolvedValue(null),
        count: vi.fn().mockResolvedValue(0),
        upsert: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      miniApp: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn(async (cb: (txClient: typeof tx) => unknown) => cb(tx)),
    } as unknown as PrismaService & {
      miniAppInvite: {
        findMany: ReturnType<typeof vi.fn>
        findUnique: ReturnType<typeof vi.fn>
        count: ReturnType<typeof vi.fn>
        upsert: ReturnType<typeof vi.fn>
        update: ReturnType<typeof vi.fn>
        deleteMany: ReturnType<typeof vi.fn>
      }
      miniApp: { findUnique: ReturnType<typeof vi.fn> }
      user: { findMany: ReturnType<typeof vi.fn> }
      $transaction: ReturnType<typeof vi.fn>
    },
    tx,
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('MiniAppInviteRepository.countHoldingSeat', () => {
  test('excludes declined invites, so a refusal frees the seat', async () => {
    const { prismaService } = createPrismaService()
    const repository = new MiniAppInviteRepository(prismaService)

    await repository.countHoldingSeat('app-1')

    expect(prismaService.miniAppInvite.count).toHaveBeenCalledWith({
      where: { miniAppId: 'app-1', status: { not: MiniAppInviteStatus.DECLINED } },
    })
  })
})

describe('MiniAppInviteRepository.upsertPendingUnderCap', () => {
  test('locks the app row, counts held seats, and upserts when under the cap', async () => {
    const { prismaService, tx } = createPrismaService()
    const repository = new MiniAppInviteRepository(prismaService)

    const result = await repository.upsertPendingUnderCap('app-1', '+66812345678', 20)

    expect(prismaService.$transaction).toHaveBeenCalledOnce()
    expect(tx.$queryRaw).toHaveBeenCalledOnce()
    const [sqlChunks, lockedMiniAppId] = tx.$queryRaw.mock.calls[0]! as [
      TemplateStringsArray,
      string,
    ]
    expect(sqlChunks.join('')).toContain('FOR UPDATE')
    expect(sqlChunks.join('')).toContain('"MiniApp"')
    expect(lockedMiniAppId).toBe('app-1')
    expect(tx.miniAppInvite.count).toHaveBeenCalledWith({
      where: { miniAppId: 'app-1', status: { not: MiniAppInviteStatus.DECLINED } },
    })
    // `upsert` (not `create`) reuses the existing row, and the update must reset
    // both the binding and the timestamp — otherwise a re-invited tester would
    // still look like they had already answered.
    expect(tx.miniAppInvite.upsert).toHaveBeenCalledWith({
      where: { miniAppId_phoneNumber: { miniAppId: 'app-1', phoneNumber: '+66812345678' } },
      create: { miniAppId: 'app-1', phoneNumber: '+66812345678' },
      update: { status: MiniAppInviteStatus.PENDING, userId: null, respondedAt: null },
    })
    expect(result._unsafeUnwrap()).toEqual({
      status: 'ok',
      invite: expect.objectContaining({
        miniAppId: 'app-1',
        phoneNumber: '+66812345678',
        status: MiniAppInviteStatus.PENDING,
      }),
    })
  })

  test('refuses without writing when the app is already at the cap', async () => {
    const { prismaService, tx } = createPrismaService()
    tx.miniAppInvite.count.mockResolvedValue(20)
    const repository = new MiniAppInviteRepository(prismaService)

    const result = await repository.upsertPendingUnderCap('app-1', '+66812345678', 20)

    expect(result._unsafeUnwrap()).toEqual({ status: 'limit_exceeded' })
    expect(tx.miniAppInvite.upsert).not.toHaveBeenCalled()
  })

  test('a declined seat does not count against the cap', async () => {
    const { prismaService, tx } = createPrismaService()
    // Nineteen held seats — the count query itself excludes DECLINED, so a
    // twentieth invite (including re-opening a declined row) is still allowed.
    tx.miniAppInvite.count.mockResolvedValue(19)
    const repository = new MiniAppInviteRepository(prismaService)

    const result = await repository.upsertPendingUnderCap('app-1', '+66899999999', 20)

    expect(result._unsafeUnwrap().status).toBe('ok')
    expect(tx.miniAppInvite.upsert).toHaveBeenCalledOnce()
  })

  test('two concurrent claims at seat 19 cannot both write when the app row is locked', async () => {
    // `$transaction` itself does not serialise — only `$queryRaw` … `FOR UPDATE`
    // does, matching Postgres row locks. Count and upsert each yield so two
    // unlocked transactions can both read 19 and both insert; with the lock,
    // the second waits and then sees 20. Dropping the lock from the repository
    // makes this fail with held === 21.
    let held = 19
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
        miniAppInvite: {
          count: vi.fn(async () => {
            await Promise.resolve()
            return held
          }),
          upsert: vi.fn(async (args: { create: { miniAppId: string; phoneNumber: string } }) => {
            await Promise.resolve()
            held += 1
            return {
              miniAppId: args.create.miniAppId,
              phoneNumber: args.create.phoneNumber,
              status: MiniAppInviteStatus.PENDING,
            }
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

    const repository = new MiniAppInviteRepository(prismaService)

    const results = await Promise.all([
      repository.upsertPendingUnderCap('app-1', '+66820000001', 20),
      repository.upsertPendingUnderCap('app-1', '+66820000002', 20),
    ])

    const statuses = results.map((result) => result._unsafeUnwrap().status)
    expect(statuses.filter((status) => status === 'ok')).toHaveLength(1)
    expect(statuses.filter((status) => status === 'limit_exceeded')).toHaveLength(1)
    expect(held).toBe(20)
  })
})

describe('MiniAppInviteRepository.listAcceptedMiniAppIds', () => {
  test('matches on the account only — never on the phone number', async () => {
    const { prismaService } = createPrismaService()
    prismaService.miniAppInvite.findMany.mockResolvedValue([
      { miniAppId: 'app-1' },
      { miniAppId: 'app-2' },
    ])
    const repository = new MiniAppInviteRepository(prismaService)

    const result = await repository.listAcceptedMiniAppIds('user-1')

    // The absence of a phoneNumber predicate here is the guarantee that
    // changing a phone number never revokes accepted access.
    expect(prismaService.miniAppInvite.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: MiniAppInviteStatus.ACCEPTED },
      select: { miniAppId: true },
    })
    expect(Array.from(result._unsafeUnwrap())).toEqual(['app-1', 'app-2'])
  })
})

describe('MiniAppInviteRepository.remove', () => {
  test('reports whether a row was actually deleted', async () => {
    const { prismaService } = createPrismaService()
    const repository = new MiniAppInviteRepository(prismaService)

    expect((await repository.remove('app-1', '+66812345678'))._unsafeUnwrap()).toBe(true)

    prismaService.miniAppInvite.deleteMany.mockResolvedValue({ count: 0 })
    expect((await repository.remove('app-1', '+66812345678'))._unsafeUnwrap()).toBe(false)
  })
})

describe('MiniAppInviteRepository.listPendingForPhoneNumber', () => {
  test('returns only unanswered invites, newest first, with the app for the card', async () => {
    const { prismaService } = createPrismaService()
    const repository = new MiniAppInviteRepository(prismaService)

    await repository.listPendingForPhoneNumber('+66812345678')

    expect(prismaService.miniAppInvite.findMany).toHaveBeenCalledWith({
      where: { phoneNumber: '+66812345678', status: MiniAppInviteStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: { miniApp: { select: { id: true, name: true, slug: true, ownerSub: true } } },
    })
  })
})

describe('MiniAppInviteRepository.getUserNamesByIds', () => {
  test('looks up display names by user id', async () => {
    const { prismaService } = createPrismaService()
    const repository = new MiniAppInviteRepository(prismaService)

    await repository.getUserNamesByIds(['builder-1', 'builder-2'])

    expect(prismaService.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['builder-1', 'builder-2'] } },
      select: { id: true, name: true },
    })
  })
})
