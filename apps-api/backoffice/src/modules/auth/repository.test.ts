import { PrismaService } from '@pple-today/api-common/services'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { AuthRepository } from './repository'

import { CommonRepository } from '../common/repository'

// The repository files also export Elysia plugins that boot the config graph.
vi.mock('../../plugins/prisma', async () => ({
  PrismaServicePlugin: new (await import('elysia')).default({ name: 'PrismaServiceStub' }),
}))

const createPrismaService = (stored: { roles: string[]; responsibleArea: string | null }) =>
  ({
    user: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        responsibleArea: stored.responsibleArea,
        roles: stored.roles.map((role) => ({ role })),
      }),
      update: vi.fn().mockResolvedValue({ id: 'user-1', roles: [], responsibleArea: null }),
    },
  }) as unknown as PrismaService & {
    user: {
      findUniqueOrThrow: ReturnType<typeof vi.fn>
      update: ReturnType<typeof vi.fn>
    }
  }

const createRepository = (prismaService: PrismaService) =>
  new AuthRepository(prismaService, {} as CommonRepository)

afterEach(() => {
  vi.clearAllMocks()
})

describe('AuthRepository.syncUserRoles', () => {
  test('skips the write when roles and public role are unchanged', async () => {
    const prismaService = createPrismaService({
      roles: ['pple-user', 'pple-ad:mp'],
      responsibleArea: 'Bangkok 1',
    })

    // Same roles in a different order count as unchanged.
    const result = await createRepository(prismaService).syncUserRoles(
      'user-1',
      ['pple-ad:mp', 'pple-user'],
      'Bangkok 1'
    )

    expect(result._unsafeUnwrap()).toEqual({ updated: false })
    expect(prismaService.user.update).not.toHaveBeenCalled()
  })

  test('ignores the stored public role when the token does not carry one', async () => {
    const prismaService = createPrismaService({
      roles: ['pple-user'],
      responsibleArea: 'Bangkok 1',
    })

    const result = await createRepository(prismaService).syncUserRoles('user-1', ['pple-user'])

    expect(result._unsafeUnwrap()).toEqual({ updated: false })
    expect(prismaService.user.update).not.toHaveBeenCalled()
  })

  test('rewrites the roles when one was added', async () => {
    const prismaService = createPrismaService({ roles: ['pple-user'], responsibleArea: null })

    const result = await createRepository(prismaService).syncUserRoles('user-1', [
      'pple-user',
      'pple-ad:mp',
    ])

    expect(result._unsafeUnwrap()).toEqual({ updated: true })
    expect(prismaService.user.update).toHaveBeenCalledTimes(1)
  })

  test('rewrites the roles when one was removed', async () => {
    const prismaService = createPrismaService({
      roles: ['pple-user', 'pple-ad:mp'],
      responsibleArea: null,
    })

    await createRepository(prismaService).syncUserRoles('user-1', ['pple-user'])

    expect(prismaService.user.update).toHaveBeenCalledTimes(1)
  })

  test('writes when only the public role changed', async () => {
    const prismaService = createPrismaService({ roles: ['pple-user'], responsibleArea: null })

    await createRepository(prismaService).syncUserRoles('user-1', ['pple-user'], 'Bangkok 1')

    expect(prismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ responsibleArea: 'Bangkok 1' }) })
    )
  })

  test('writes when the public role was cleared', async () => {
    const prismaService = createPrismaService({
      roles: ['pple-user'],
      responsibleArea: 'Bangkok 1',
    })

    await createRepository(prismaService).syncUserRoles('user-1', ['pple-user'], null)

    expect(prismaService.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ responsibleArea: null }) })
    )
  })
})
