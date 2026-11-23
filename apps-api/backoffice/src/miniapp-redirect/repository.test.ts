import type { PrismaService } from '@pple-today/api-common/services'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { MiniAppRedirectRepository } from './repository'

vi.mock('../plugins/prisma', async () => ({
  PrismaServicePlugin: new (await import('elysia')).default({ name: 'PrismaServiceStub' }),
}))

const createPrisma = () => {
  const miniApp = { findUnique: vi.fn() }
  const miniAppLinkName = { findUnique: vi.fn() }
  const prismaService = { miniApp, miniAppLinkName } as unknown as PrismaService
  return { prismaService, miniApp, miniAppLinkName }
}

describe('MiniAppRedirectRepository.getMiniAppByEntry', () => {
  let prisma: ReturnType<typeof createPrisma>
  let repository: MiniAppRedirectRepository

  beforeEach(() => {
    prisma = createPrisma()
    repository = new MiniAppRedirectRepository(prisma.prismaService)
  })

  test('resolves a slug exactly and does not consult Link Names', async () => {
    prisma.miniApp.findUnique.mockResolvedValue({ clientUrl: 'https://donate.ppleth.ai' })

    const result = await repository.getMiniAppByEntry('brave-purple-lion')

    expect(result._unsafeUnwrap()).toEqual({ clientUrl: 'https://donate.ppleth.ai' })
    expect(prisma.miniApp.findUnique).toHaveBeenCalledWith({
      where: { slug: 'brave-purple-lion' },
      select: { clientUrl: true },
    })
    expect(prisma.miniAppLinkName.findUnique).not.toHaveBeenCalled()
  })

  test('a replaced Link Name still resolves to the same app, matched in lowercase', async () => {
    prisma.miniApp.findUnique.mockResolvedValue(null)
    prisma.miniAppLinkName.findUnique.mockResolvedValue({
      miniApp: { clientUrl: 'https://donate.ppleth.ai', retiredAt: null },
    })

    const result = await repository.getMiniAppByEntry('Old-Donate')

    expect(result._unsafeUnwrap()).toEqual({ clientUrl: 'https://donate.ppleth.ai' })
    // No canonical filter: a replaced name (canonicalForId null) redirects too.
    expect(prisma.miniAppLinkName.findUnique).toHaveBeenCalledWith({
      where: { name: 'old-donate' },
      select: { miniApp: { select: { clientUrl: true, retiredAt: true } } },
    })
  })

  test('a Link Name on a retired app does not resolve', async () => {
    prisma.miniApp.findUnique.mockResolvedValue(null)
    prisma.miniAppLinkName.findUnique.mockResolvedValue({
      miniApp: { clientUrl: 'https://donate.ppleth.ai', retiredAt: new Date() },
    })

    const result = await repository.getMiniAppByEntry('donate')

    expect(result._unsafeUnwrap()).toBeNull()
  })
})
