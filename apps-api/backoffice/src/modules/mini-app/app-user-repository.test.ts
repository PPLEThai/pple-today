import { PrismaService } from '@pple-today/api-common/services'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { MiniAppUserRepository } from './app-user-repository'

const createPrismaService = () =>
  ({
    miniAppUser: {
      upsert: vi.fn().mockResolvedValue({ miniAppId: 'app-1', userId: 'user-1' }),
      count: vi.fn().mockResolvedValue(3),
    },
    miniApp: { count: vi.fn().mockResolvedValue(1) },
    user: { count: vi.fn().mockResolvedValue(0) },
  }) as unknown as PrismaService & {
    miniAppUser: { upsert: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> }
    miniApp: { count: ReturnType<typeof vi.fn> }
    user: { count: ReturnType<typeof vi.fn> }
  }

afterEach(() => {
  vi.clearAllMocks()
})

describe('MiniAppUserRepository.register', () => {
  test('upserts on the composite key with an empty update, so repeat opens are idempotent', async () => {
    const prismaService = createPrismaService()
    const repository = new MiniAppUserRepository(prismaService)

    await repository.register('app-1', 'user-1')

    // `upsert` (not `create`) with `update: {}` is what makes a second open a
    // no-op that preserves the original `firstOpenedAt`.
    expect(prismaService.miniAppUser.upsert).toHaveBeenCalledWith({
      where: { miniAppId_userId: { miniAppId: 'app-1', userId: 'user-1' } },
      create: { miniAppId: 'app-1', userId: 'user-1' },
      update: {},
    })
  })
})

describe('MiniAppUserRepository.countByMiniApp', () => {
  test('counts rows scoped to the given mini app', async () => {
    const prismaService = createPrismaService()
    const repository = new MiniAppUserRepository(prismaService)

    const result = await repository.countByMiniApp('app-1')

    expect(prismaService.miniAppUser.count).toHaveBeenCalledWith({ where: { miniAppId: 'app-1' } })
    expect(result._unsafeUnwrap()).toBe(3)
  })
})

describe('MiniAppUserRepository existence checks', () => {
  test('activeMiniAppExists excludes retired apps', async () => {
    const prismaService = createPrismaService()
    const repository = new MiniAppUserRepository(prismaService)

    const result = await repository.activeMiniAppExists('app-1')

    expect(prismaService.miniApp.count).toHaveBeenCalledWith({
      where: { id: 'app-1', retiredAt: null },
    })
    expect(result._unsafeUnwrap()).toBe(true)
  })

  test('userExists matches on User.id', async () => {
    const prismaService = createPrismaService()
    const repository = new MiniAppUserRepository(prismaService)

    const result = await repository.userExists('ghost')

    expect(prismaService.user.count).toHaveBeenCalledWith({ where: { id: 'ghost' } })
    expect(result._unsafeUnwrap()).toBe(false)
  })
})
