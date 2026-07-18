import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { err, ok } from 'neverthrow'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { MiniAppUserRepository } from './app-user-repository'
import { AppUserService } from './app-user-service'

const loggerService = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
} as any as ElysiaLoggerInstance

/**
 * In-memory stand-in for `MiniAppUserRepository`. It models the one property the
 * App User behaviour depends on: the `(miniAppId, userId)` composite primary key
 * makes `register` idempotent, exactly as the Prisma `upsert` does against the
 * real table. The repository's own use of `upsert` (not `create`) is asserted
 * separately in `app-user-repository.test.ts`.
 */
const createFakeRepository = () => {
  const store = new Set<string>()
  const key = (miniAppId: string, userId: string) => `${miniAppId}|${userId}`

  return {
    store,
    register: vi.fn(async (miniAppId: string, userId: string) => {
      store.add(key(miniAppId, userId))
      return ok({ miniAppId, userId })
    }),
    countByMiniApp: vi.fn(async (miniAppId: string) =>
      ok(Array.from(store).filter((entry) => entry.startsWith(`${miniAppId}|`)).length)
    ),
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('AppUserService.registerOpen', () => {
  test('registers a user as an App User on first open', async () => {
    const repository = createFakeRepository()
    const service = new AppUserService(
      repository as unknown as MiniAppUserRepository,
      loggerService
    )

    await service.registerOpen('app-1', 'user-1')

    expect(repository.register).toHaveBeenCalledWith('app-1', 'user-1')
    expect((await service.getUserCount('app-1'))._unsafeUnwrap()).toBe(1)
  })

  test('repeat opens are idempotent — the count stays at one', async () => {
    const repository = createFakeRepository()
    const service = new AppUserService(
      repository as unknown as MiniAppUserRepository,
      loggerService
    )

    await service.registerOpen('app-1', 'user-1')
    await service.registerOpen('app-1', 'user-1')
    await service.registerOpen('app-1', 'user-1')

    expect(repository.register).toHaveBeenCalledTimes(3)
    expect((await service.getUserCount('app-1'))._unsafeUnwrap()).toBe(1)
  })

  test('counts distinct App Users per app in isolation', async () => {
    const repository = createFakeRepository()
    const service = new AppUserService(
      repository as unknown as MiniAppUserRepository,
      loggerService
    )

    await service.registerOpen('app-1', 'user-1')
    await service.registerOpen('app-1', 'user-2')
    await service.registerOpen('app-2', 'user-1')

    expect((await service.getUserCount('app-1'))._unsafeUnwrap()).toBe(2)
    expect((await service.getUserCount('app-2'))._unsafeUnwrap()).toBe(1)
    expect((await service.getUserCount('app-3'))._unsafeUnwrap()).toBe(0)
  })

  test('is best-effort: a repository failure is logged, not thrown', async () => {
    const repository = createFakeRepository()
    repository.register.mockResolvedValueOnce(
      err({ code: 'UNKNOWN_ERROR', message: 'database is down' }) as never
    )
    const service = new AppUserService(
      repository as unknown as MiniAppUserRepository,
      loggerService
    )

    await expect(service.registerOpen('app-1', 'user-1')).resolves.toBeUndefined()
    expect(loggerService.error).toHaveBeenCalledOnce()
  })
})

describe('AppUserService.getUserCount', () => {
  test('maps a repository error to an internal server error', async () => {
    const repository = createFakeRepository()
    repository.countByMiniApp.mockResolvedValueOnce(
      err({ code: 'UNKNOWN_ERROR', message: 'database is down' }) as never
    )
    const service = new AppUserService(
      repository as unknown as MiniAppUserRepository,
      loggerService
    )

    const result = await service.getUserCount('app-1')

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.INTERNAL_SERVER_ERROR)
  })
})
