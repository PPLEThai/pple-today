import { beforeAll, describe, expect, it, vi } from 'vitest'

const constructorCalled = vi.fn()
class PrismaClient {
  constructor(args: any) {
    constructorCalled(args)
  }
  $on() {}
}

vi.mock('@pple-today/database/prisma', () => ({
  PrismaClient,
}))

describe('Prisma Service', async () => {
  const { PrismaService } = await import('./prisma')

  const loggerServiceMockData = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }

  beforeAll(() => {
    constructorCalled.mockReset()
  })

  it('should be initialized without errors', () => {
    const prisma = new PrismaService(loggerServiceMockData as any)

    expect(prisma).toBeInstanceOf(PrismaService)
    expect(constructorCalled).toHaveBeenCalledTimes(1)
    expect(constructorCalled.mock.calls[0][0]).toEqual({
      errorFormat: 'minimal',
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    })
  })
})
