import type { PrismaService } from '@pple-today/api-common/services'
import { NotificationApiKeySource } from '@pple-today/database/prisma'
import { describe, expect, test, vi } from 'vitest'

import { AdminNotificationRepository } from './repository'

const createRepository = () => {
  const create = vi.fn(async (_args: { data: Record<string, unknown> }) => ({
    id: 'new-key-id',
    name: 'Canvassing key',
    apiKey: 'hashed',
    active: true,
    miniAppId: (_args.data.miniAppId as string | undefined) ?? null,
    source: NotificationApiKeySource.ADMIN,
    dailyQuota: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
  const findMany = vi.fn(async (_args: unknown) => [])
  const findUniqueOrThrow = vi.fn(async (_args: unknown) => ({
    source: NotificationApiKeySource.PLATFORM,
  }))

  const prismaService = {
    notificationApiKey: { create, findMany, findUniqueOrThrow },
  } as unknown as PrismaService

  return {
    repository: new AdminNotificationRepository(prismaService),
    create,
    findMany,
    findUniqueOrThrow,
  }
}

describe('AdminNotificationRepository', () => {
  test('createApiKey binds the new key to the given mini app', async () => {
    const { repository, create } = createRepository()

    const result = await repository.createApiKey({ name: 'Canvassing key', miniAppId: 'app-1' })

    expect(result.isOk()).toBe(true)
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: 'Canvassing key', miniAppId: 'app-1' }),
      })
    )
    // The plaintext key travels back out of the repository exactly once, alongside the row.
    if (result.isOk()) {
      expect(result.value.miniAppId).toBe('app-1')
      expect(typeof result.value.apiKey).toBe('string')
    }
  })

  test('createApiKey leaves miniAppId undefined for an unbound key', async () => {
    const { repository, create } = createRepository()

    await repository.createApiKey({ name: 'Legacy key' })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ miniAppId: undefined }) })
    )
  })

  test('createApiKey does not name a source, so the ADMIN default applies', async () => {
    // An admin-portal key is an admin key by construction. Spelling it here as
    // well would give a second place for the two to disagree.
    const { repository, create } = createRepository()

    await repository.createApiKey({ name: 'Enhanced audience key', miniAppId: 'builder-app' })

    const [args] = create.mock.calls[0]!
    expect(args.data).not.toHaveProperty('source')
  })

  test('listApiKeys filters by mini app and selects the binding and provenance', async () => {
    const { repository, findMany } = createRepository()

    await repository.listApiKeys({ limit: 10, page: 1, miniAppId: 'app-1' })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { miniAppId: 'app-1' },
        // `source` goes out with the row because the portal must not offer to
        // manage a key the provisioner owns.
        select: expect.objectContaining({ miniAppId: true, source: true }),
      })
    )
  })

  test('findApiKeySource reads provenance alone, by id', async () => {
    const { repository, findUniqueOrThrow } = createRepository()

    const result = await repository.findApiKeySource('key-1')

    expect(findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'key-1' },
      select: { source: true },
    })
    expect(result._unsafeUnwrap().source).toBe(NotificationApiKeySource.PLATFORM)
  })

  test('listApiKeys omits the where clause when no mini app is given', async () => {
    const { repository, findMany } = createRepository()

    await repository.listApiKeys({ limit: 10, page: 1 })

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }))
  })
})
