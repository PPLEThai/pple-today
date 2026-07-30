import type { PrismaService } from '@pple-today/api-common/services'
import { describe, expect, test, vi } from 'vitest'

import { AdminNotificationRepository } from './repository'

const createRepository = () => {
  const create = vi.fn(async (_args: { data: Record<string, unknown> }) => ({
    id: 'new-key-id',
    name: 'Canvassing key',
    apiKey: 'hashed',
    active: true,
    miniAppId: (_args.data.miniAppId as string | undefined) ?? null,
    dailyQuota: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  }))
  const findMany = vi.fn(async (_args: unknown) => [])

  const prismaService = {
    notificationApiKey: { create, findMany },
  } as unknown as PrismaService

  return {
    repository: new AdminNotificationRepository(prismaService),
    create,
    findMany,
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

  test('listApiKeys filters by mini app and selects the binding', async () => {
    const { repository, findMany } = createRepository()

    await repository.listApiKeys({ limit: 10, page: 1, miniAppId: 'app-1' })

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { miniAppId: 'app-1' },
        select: expect.objectContaining({ miniAppId: true }),
      })
    )
  })

  test('listApiKeys omits the where clause when no mini app is given', async () => {
    const { repository, findMany } = createRepository()

    await repository.listApiKeys({ limit: 10, page: 1 })

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }))
  })
})
