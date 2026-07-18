import { PrismaService } from '@pple-today/api-common/services'
import { MiniAppInviteStatus } from '@pple-today/database/prisma'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { MiniAppInviteRepository } from './invite-repository'

const createPrismaService = () =>
  ({
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
  }) as unknown as PrismaService & {
    miniAppInvite: {
      findMany: ReturnType<typeof vi.fn>
      findUnique: ReturnType<typeof vi.fn>
      count: ReturnType<typeof vi.fn>
      upsert: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
      deleteMany: ReturnType<typeof vi.fn>
    }
    miniApp: { findUnique: ReturnType<typeof vi.fn> }
  }

afterEach(() => {
  vi.clearAllMocks()
})

describe('MiniAppInviteRepository.countHoldingSeat', () => {
  test('excludes declined invites, so a refusal frees the seat', async () => {
    const prismaService = createPrismaService()
    const repository = new MiniAppInviteRepository(prismaService)

    await repository.countHoldingSeat('app-1')

    expect(prismaService.miniAppInvite.count).toHaveBeenCalledWith({
      where: { miniAppId: 'app-1', status: { not: MiniAppInviteStatus.DECLINED } },
    })
  })
})

describe('MiniAppInviteRepository.upsertPending', () => {
  test('re-opening a declined invite clears the previous answer', async () => {
    const prismaService = createPrismaService()
    const repository = new MiniAppInviteRepository(prismaService)

    await repository.upsertPending('app-1', '+66812345678')

    // `upsert` (not `create`) reuses the existing row, and the update must reset
    // both the binding and the timestamp — otherwise a re-invited tester would
    // still look like they had already answered.
    expect(prismaService.miniAppInvite.upsert).toHaveBeenCalledWith({
      where: { miniAppId_phoneNumber: { miniAppId: 'app-1', phoneNumber: '+66812345678' } },
      create: { miniAppId: 'app-1', phoneNumber: '+66812345678' },
      update: { status: MiniAppInviteStatus.PENDING, userId: null, respondedAt: null },
    })
  })
})

describe('MiniAppInviteRepository.listAcceptedMiniAppIds', () => {
  test('matches on the account only — never on the phone number', async () => {
    const prismaService = createPrismaService()
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
    const prismaService = createPrismaService()
    const repository = new MiniAppInviteRepository(prismaService)

    expect((await repository.remove('app-1', '+66812345678'))._unsafeUnwrap()).toBe(true)

    prismaService.miniAppInvite.deleteMany.mockResolvedValue({ count: 0 })
    expect((await repository.remove('app-1', '+66812345678'))._unsafeUnwrap()).toBe(false)
  })
})

describe('MiniAppInviteRepository.listPendingForPhoneNumber', () => {
  test('returns only unanswered invites, newest first, with the app for the card', async () => {
    const prismaService = createPrismaService()
    const repository = new MiniAppInviteRepository(prismaService)

    await repository.listPendingForPhoneNumber('+66812345678')

    expect(prismaService.miniAppInvite.findMany).toHaveBeenCalledWith({
      where: { phoneNumber: '+66812345678', status: MiniAppInviteStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      include: { miniApp: { select: { id: true, name: true, slug: true } } },
    })
  })
})
