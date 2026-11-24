import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { PrismaService } from '@pple-today/api-common/services'
import { MiniAppSource, MiniAppTier } from '@pple-today/database/prisma'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { PlatformMiniAppRepository } from './mini-app-repository'

import { miniAppResponseInclude } from '../mini-app/dto'

/**
 * A Prisma stand-in whose `$transaction` runs its callback against a fake `tx`
 * of spies, so tests can assert the exact writes the repository makes without a
 * database. Each spy resolves to a minimal row shaped like the real return.
 */
const createPrismaService = () => {
  const tx = {
    miniApp: {
      create: vi.fn().mockResolvedValue({ id: 'app-1', miniAppRoles: [] }),
      update: vi.fn().mockResolvedValue({ id: 'app-1', miniAppRoles: [], linkNames: [] }),
      findFirst: vi.fn().mockResolvedValue(null),
      findUniqueOrThrow: vi
        .fn()
        .mockResolvedValue({ id: 'app-1', miniAppRoles: [], linkNames: [] }),
    },
    miniAppLinkName: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ name: 'donate' }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      delete: vi.fn().mockResolvedValue({}),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    notificationApiKey: {
      create: vi.fn().mockResolvedValue({ id: 'key-1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    notificationResponse: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
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

  test('refuses a slug that matches a held Link Name, in any case, before inserting', async () => {
    const { prismaService, tx } = createPrismaService()
    tx.miniAppLinkName.findUnique.mockResolvedValue({ name: 'my-app' })
    const repository = new PlatformMiniAppRepository(prismaService)

    const result = await repository.createMiniApp({ ...input, slug: 'My-App' })

    expect(result._unsafeUnwrapErr()).toMatchObject({
      code: InternalErrorCode.MINI_APP_LINK_NAME_TAKEN,
      message: 'Slug clashes with a held Link Name',
    })
    expect(tx.miniAppLinkName.findUnique).toHaveBeenCalledWith({
      where: { name: 'my-app' },
      select: { name: true },
    })
    expect(tx.miniApp.create).not.toHaveBeenCalled()
  })

  test('stores a canonical Link Name in lowercase and refuses one that clashes with a slug', async () => {
    const { prismaService, tx } = createPrismaService()
    const repository = new PlatformMiniAppRepository(prismaService)

    await repository.createMiniApp({ ...input, linkName: 'Donate' })

    expect(tx.miniApp.findFirst).toHaveBeenCalledWith({
      where: { slug: { equals: 'donate', mode: 'insensitive' } },
      select: { id: true },
    })
    expect(tx.miniAppLinkName.create).toHaveBeenCalledWith({
      data: { name: 'donate', miniAppId: 'app-1', canonicalForId: 'app-1' },
    })

    tx.miniApp.findFirst.mockResolvedValue({ id: 'other-app' })
    const clash = await repository.createMiniApp({ ...input, linkName: 'Taken' })
    expect(clash._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_LINK_NAME_TAKEN)
  })

  test('refuses a Link Name that another app already holds', async () => {
    const { prismaService, tx } = createPrismaService()
    tx.miniAppLinkName.findUnique.mockImplementation(
      async ({ where }: { where: { name: string } }) =>
        where.name === 'donate' ? { name: 'donate', miniAppId: 'other-app' } : null
    )
    const repository = new PlatformMiniAppRepository(prismaService)

    const result = await repository.createMiniApp({ ...input, linkName: 'DONATE' })

    expect(result._unsafeUnwrapErr()).toMatchObject({
      code: InternalErrorCode.MINI_APP_LINK_NAME_TAKEN,
      message: 'Link Name is already held',
    })
    expect(tx.miniAppLinkName.create).not.toHaveBeenCalled()
  })

  test('refuses a Link Name equal to the slug being created', async () => {
    const { prismaService, tx } = createPrismaService()
    const repository = new PlatformMiniAppRepository(prismaService)

    const result = await repository.createMiniApp({ ...input, linkName: 'My-App' })

    expect(result._unsafeUnwrapErr().message).toBe('Link Name clashes with a mini-app slug')
    expect(tx.miniApp.create).not.toHaveBeenCalled()
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
    expect(tx.miniAppLinkName.deleteMany).toHaveBeenCalledWith({ where: { miniAppId: 'app-1' } })
  })

  test('fails the app\'s PENDING notification responses with "app retired"', async () => {
    const { prismaService, tx } = createPrismaService()
    const repository = new PlatformMiniAppRepository(prismaService)

    await repository.retire('app-1')

    expect(tx.notificationResponse.updateMany).toHaveBeenCalledWith({
      where: { miniAppId: 'app-1', deliveryStatus: 'PENDING' },
      data: {
        deliveryStatus: 'FAILED',
        lastError: 'app retired',
        lastAttemptAt: expect.any(Date),
        nextAttemptAt: null,
      },
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
      include: miniAppResponseInclude,
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

describe('PlatformMiniAppRepository link name lifecycle', () => {
  type HeldName = { name: string; miniAppId: string; canonicalForId: string | null }

  const memory = (seed: HeldName[], slugs: { id: string; slug: string }[] = []) => {
    const names = seed.map((row) => ({ ...row }))
    const matchesSlug = (equals: string) =>
      slugs.find((app) => app.slug.toLowerCase() === equals.toLowerCase()) ?? null

    const linkNames = {
      findUnique: async ({ where }: { where: { name: string } }) =>
        names.find((row) => row.name === where.name) ?? null,
      updateMany: async ({
        where,
        data,
      }: {
        where: { miniAppId: string; canonicalForId: { not: null }; NOT: { name: string } }
        data: { canonicalForId: string | null }
      }) => {
        let count = 0
        for (const row of names) {
          if (
            row.miniAppId === where.miniAppId &&
            row.canonicalForId !== null &&
            row.name !== where.NOT.name
          ) {
            row.canonicalForId = data.canonicalForId
            count++
          }
        }
        return { count }
      },
      update: async ({
        where,
        data,
      }: {
        where: { name: string }
        data: { canonicalForId: string }
      }) => {
        const row = names.find((item) => item.name === where.name)
        if (!row) throw new Error('missing link name')
        row.canonicalForId = data.canonicalForId
        return row
      },
      create: async ({ data }: { data: HeldName }) => {
        names.push({ ...data })
        return data
      },
      deleteMany: async ({
        where,
      }: {
        where: { miniAppId: string; canonicalForId: { not: null } }
      }) => {
        let count = 0
        for (let i = names.length - 1; i >= 0; i--) {
          const row = names[i]
          if (row.miniAppId === where.miniAppId && row.canonicalForId !== null) {
            names.splice(i, 1)
            count++
          }
        }
        return { count }
      },
      delete: async ({ where }: { where: { name: string } }) => {
        const index = names.findIndex((row) => row.name === where.name)
        if (index < 0) throw new Error('missing link name')
        return names.splice(index, 1)[0]
      },
    }

    const read = async () => ({
      id: 'app-1',
      miniAppRoles: [],
      linkNames: names
        .filter((row) => row.miniAppId === 'app-1' && row.canonicalForId !== null)
        .map((row) => ({ name: row.name })),
    })

    const prismaService = {
      $transaction: async (cb: (tx: unknown) => unknown) =>
        cb({
          miniApp: {
            findFirst: async ({ where }: { where: { slug: { equals: string } } }) =>
              matchesSlug(where.slug.equals),
            update: read,
          },
          miniAppLinkName: linkNames,
        }),
      miniApp: { findFirstOrThrow: async () => ({ id: 'app-1', miniAppRoles: [], linkNames: [] }) },
      miniAppLinkName: linkNames,
    } as unknown as PrismaService

    return { prismaService, names }
  }

  test('setting a new name demotes the previous canonical one and keeps it redirecting', async () => {
    const { prismaService, names } = memory([
      { name: 'old', miniAppId: 'app-1', canonicalForId: 'app-1' },
    ])
    const repository = new PlatformMiniAppRepository(prismaService)

    const result = await repository.updateMiniApp('app-1', { linkName: 'New' })

    expect(result._unsafeUnwrap().linkNames).toEqual([{ name: 'new' }])
    expect(names).toEqual([
      { name: 'old', miniAppId: 'app-1', canonicalForId: null },
      { name: 'new', miniAppId: 'app-1', canonicalForId: 'app-1' },
    ])
  })

  test('promotes a replaced name of this app instead of treating it as taken', async () => {
    const { prismaService, names } = memory([
      { name: 'current', miniAppId: 'app-1', canonicalForId: 'app-1' },
      { name: 'former', miniAppId: 'app-1', canonicalForId: null },
    ])
    const repository = new PlatformMiniAppRepository(prismaService)

    await repository.updateMiniApp('app-1', { linkName: 'Former' })

    expect(names).toEqual([
      { name: 'current', miniAppId: 'app-1', canonicalForId: null },
      { name: 'former', miniAppId: 'app-1', canonicalForId: 'app-1' },
    ])
  })

  test('null releases only the canonical name', async () => {
    const { prismaService, names } = memory([
      { name: 'current', miniAppId: 'app-1', canonicalForId: 'app-1' },
      { name: 'former', miniAppId: 'app-1', canonicalForId: null },
    ])
    const repository = new PlatformMiniAppRepository(prismaService)

    const result = await repository.updateMiniApp('app-1', { linkName: null })

    expect(result._unsafeUnwrap().linkNames).toEqual([])
    expect(names).toEqual([{ name: 'former', miniAppId: 'app-1', canonicalForId: null }])
  })

  test('refuses a name that matches a slug in any case', async () => {
    const { prismaService } = memory([], [{ id: 'other', slug: 'Donate' }])
    const repository = new PlatformMiniAppRepository(prismaService)

    const result = await repository.updateMiniApp('app-1', { linkName: 'donate' })

    expect(result._unsafeUnwrapErr()).toMatchObject({
      code: InternalErrorCode.MINI_APP_LINK_NAME_TAKEN,
      message: 'Link Name clashes with a mini-app slug',
    })
  })

  test('DELETE releases a replaced name and leaves the canonical one', async () => {
    const { prismaService, names } = memory([
      { name: 'current', miniAppId: 'app-1', canonicalForId: 'app-1' },
      { name: 'former', miniAppId: 'app-1', canonicalForId: null },
    ])
    const repository = new PlatformMiniAppRepository(prismaService)

    const result = await repository.releaseLinkName('app-1', 'Former')

    expect(result._unsafeUnwrap()).toEqual({ message: 'Link name released' })
    expect(names).toEqual([{ name: 'current', miniAppId: 'app-1', canonicalForId: 'app-1' }])
  })
})
