import type { PrismaService } from '@pple-today/api-common/services'
import { describe, expect, test, vi } from 'vitest'

import { MiniAppRepository } from './repository'

// The repository file also exports an Elysia plugin that boots the config graph.
vi.mock('../../plugins/prisma', async () => ({
  PrismaServicePlugin: new (await import('elysia')).default({ name: 'PrismaServiceStub' }),
}))

const APP: {
  id: string
  slug: string
  retiredAt: Date | null
  miniAppRoles: []
} = {
  id: 'app-1',
  slug: 'brave-purple-lion',
  retiredAt: null,
  miniAppRoles: [],
}

describe('MiniAppRepository.getMiniAppBySlug', () => {
  const repositoryFor = (options: {
    bySlug?: typeof APP | null
    byName?: { miniApp: typeof APP } | null
  }) => {
    const miniApp = { findUnique: vi.fn(async () => options.bySlug ?? null) }
    const miniAppLinkName = { findUnique: vi.fn(async () => options.byName ?? null) }
    const prisma = { miniApp, miniAppLinkName } as unknown as PrismaService
    return { miniApp, miniAppLinkName, repository: new MiniAppRepository(prisma) }
  }

  test('a slug still loads the app, without a Link Name lookup', async () => {
    const { miniAppLinkName, repository } = repositoryFor({ bySlug: APP })

    const result = await repository.getMiniAppBySlug('brave-purple-lion')

    expect(result._unsafeUnwrap().slug).toBe('brave-purple-lion')
    expect(miniAppLinkName.findUnique).not.toHaveBeenCalled()
  })

  test('a held Link Name loads that app', async () => {
    const { miniAppLinkName, repository } = repositoryFor({
      byName: { miniApp: APP },
    })

    const result = await repository.getMiniAppBySlug('Donate')

    expect(miniAppLinkName.findUnique).toHaveBeenCalledWith({
      where: { name: 'donate' },
      select: { miniApp: { include: { miniAppRoles: true } } },
    })
    expect(result._unsafeUnwrap().slug).toBe('brave-purple-lion')
  })

  test('a missing entry is not found', async () => {
    const { repository } = repositoryFor({})

    expect((await repository.getMiniAppBySlug('missing'))._unsafeUnwrapErr().code).toBe(
      'RECORD_NOT_FOUND'
    )
  })

  test('a retired app is not found by slug or by a leftover name', async () => {
    const retired = { ...APP, retiredAt: new Date('2026-11-01T00:00:00.000Z') }
    const bySlug = repositoryFor({ bySlug: retired })
    const byName = repositoryFor({ byName: { miniApp: retired } })

    expect((await bySlug.repository.getMiniAppBySlug(APP.slug))._unsafeUnwrapErr().code).toBe(
      'RECORD_NOT_FOUND'
    )
    expect(bySlug.miniAppLinkName.findUnique).not.toHaveBeenCalled()
    expect((await byName.repository.getMiniAppBySlug('donate'))._unsafeUnwrapErr().code).toBe(
      'RECORD_NOT_FOUND'
    )
  })
})
