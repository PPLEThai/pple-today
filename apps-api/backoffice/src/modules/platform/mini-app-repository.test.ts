import { PrismaService } from '@pple-today/api-common/services'
import { MiniAppSource, MiniAppTier } from '@pple-today/database/prisma'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { PlatformMiniAppRepository } from './mini-app-repository'

/**
 * A Prisma stand-in whose `$transaction` runs its callback against a fake `tx`
 * of spies, so tests can assert the exact writes the repository makes without a
 * database. Each spy resolves to a minimal row shaped like the real return.
 */
const createPrismaService = () => {
  const tx = {
    miniApp: {
      create: vi.fn().mockResolvedValue({ id: 'app-1', miniAppRoles: [] }),
      update: vi.fn().mockResolvedValue({ id: 'app-1', miniAppRoles: [] }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'app-1', miniAppRoles: [] }),
    },
    notificationApiKey: {
      create: vi.fn().mockResolvedValue({ id: 'key-1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    miniAppRole: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  }

  const miniApp = {
    findFirstOrThrow: vi.fn().mockResolvedValue({ id: 'app-1', miniAppRoles: [] }),
    update: vi.fn().mockResolvedValue({ id: 'app-1', miniAppRoles: [] }),
  }

  const prismaService = {
    miniApp,
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(tx)),
  } as unknown as PrismaService

  return { prismaService, tx, miniApp }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('PlatformMiniAppRepository.createMiniApp', () => {
  const input = {
    name: 'My App',
    slug: 'my-app',
    url: 'https://my-app.ppleth.ai',
    ownerSub: 'owner-sub',
    clientId: 'client-1',
    zitadelAppId: 'zitadel-app-1',
  }

  test('creates a DRAFT/PLATFORM row owned by the Builder, storing the Zitadel ids', async () => {
    const { prismaService, tx } = createPrismaService()
    const repository = new PlatformMiniAppRepository(prismaService)

    await repository.createMiniApp(input)

    expect(tx.miniApp.create).toHaveBeenCalledOnce()
    expect(tx.miniApp.create.mock.calls[0][0].data).toMatchObject({
      name: 'My App',
      slug: 'my-app',
      clientUrl: 'https://my-app.ppleth.ai',
      clientId: 'client-1',
      zitadelAppId: 'zitadel-app-1',
      requiresAuth: true,
      tier: MiniAppTier.DRAFT,
      source: MiniAppSource.PLATFORM,
      ownerSub: 'owner-sub',
    })
  })

  test('binds a notification key to the app and stores it hashed, returning the plaintext once', async () => {
    const { prismaService, tx } = createPrismaService()
    const repository = new PlatformMiniAppRepository(prismaService)

    const result = await repository.createMiniApp(input)

    const keyData = tx.notificationApiKey.create.mock.calls[0][0].data
    expect(keyData.miniAppId).toBe('app-1')
    // The plaintext key is returned to the caller...
    const plaintext = result._unsafeUnwrap().notificationApiKey
    expect(plaintext).toMatch(/^pple_notification_/)
    // ...but only its (non-plaintext) hash is persisted.
    expect(keyData.apiKey).not.toBe(plaintext)
    expect(keyData.apiKey).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('PlatformMiniAppRepository.getMiniAppById', () => {
  test('scopes the lookup to source = PLATFORM, so admin apps are invisible to the platform API', async () => {
    const { prismaService, miniApp } = createPrismaService()
    const repository = new PlatformMiniAppRepository(prismaService)

    await repository.getMiniAppById('app-1')

    expect(miniApp.findFirstOrThrow).toHaveBeenCalledWith({
      where: { id: 'app-1', source: MiniAppSource.PLATFORM },
      include: { miniAppRoles: true },
    })
  })
})

describe('PlatformMiniAppRepository.retire', () => {
  test('stamps retiredAt and deactivates the app-bound notification key(s)', async () => {
    const { prismaService, tx } = createPrismaService()
    const repository = new PlatformMiniAppRepository(prismaService)

    await repository.retire('app-1')

    expect(tx.miniApp.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'app-1' },
      data: { retiredAt: expect.any(Date) },
    })
    expect(tx.notificationApiKey.updateMany).toHaveBeenCalledWith({
      where: { miniAppId: 'app-1', active: true },
      data: { active: false },
    })
  })
})

describe('PlatformMiniAppRepository.setRoles', () => {
  test('replaces the role set, deleting the old rows before inserting the new ones', async () => {
    const { prismaService, tx } = createPrismaService()
    const repository = new PlatformMiniAppRepository(prismaService)

    await repository.setRoles('app-1', ['pple-ad:member', 'pple-ad:staff'])

    expect(tx.miniAppRole.deleteMany).toHaveBeenCalledWith({ where: { miniAppId: 'app-1' } })
    expect(tx.miniAppRole.createMany).toHaveBeenCalledWith({
      data: [
        { role: 'pple-ad:member', miniAppId: 'app-1' },
        { role: 'pple-ad:staff', miniAppId: 'app-1' },
      ],
    })
  })

  test('an empty role set deletes all rows and inserts none (visible to everyone)', async () => {
    const { prismaService, tx } = createPrismaService()
    const repository = new PlatformMiniAppRepository(prismaService)

    await repository.setRoles('app-1', [])

    expect(tx.miniAppRole.deleteMany).toHaveBeenCalledWith({ where: { miniAppId: 'app-1' } })
    expect(tx.miniAppRole.createMany).not.toHaveBeenCalled()
  })
})

describe('PlatformMiniAppRepository.setUnlisted', () => {
  test('updates only the unlisted flag, leaving the visibility roles untouched', async () => {
    const { prismaService, miniApp } = createPrismaService()
    const repository = new PlatformMiniAppRepository(prismaService)

    await repository.setUnlisted('app-1', true)

    expect(miniApp.update).toHaveBeenCalledWith({
      where: { id: 'app-1' },
      data: { unlisted: true },
      include: { miniAppRoles: true },
    })
  })
})

describe('PlatformMiniAppRepository.setCollaborators', () => {
  test('replaces the whole collaborator set so today-v2 mirrors the platform exactly', async () => {
    const { prismaService, miniApp } = createPrismaService()
    const repository = new PlatformMiniAppRepository(prismaService)

    await repository.setCollaborators('app-1', ['sub-a', 'sub-b'])

    expect(miniApp.update).toHaveBeenCalledWith({
      where: { id: 'app-1' },
      data: { collaboratorSubs: ['sub-a', 'sub-b'] },
      include: { miniAppRoles: true },
    })
  })
})
