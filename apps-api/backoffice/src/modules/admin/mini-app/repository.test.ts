import type { FileService, PrismaService } from '@pple-today/api-common/services'
import { describe, expect, test, vi } from 'vitest'

import { AdminMiniAppRepository } from './repository'

// The repository file also exports an Elysia plugin that boots the config graph.
vi.mock('../../../plugins/file', async () => ({
  FileServicePlugin: new (await import('elysia')).default({ name: 'FileServiceStub' }),
}))
vi.mock('../../../plugins/prisma', async () => ({
  PrismaServicePlugin: new (await import('elysia')).default({ name: 'PrismaServiceStub' }),
}))

const setup = () => {
  const ops: string[] = []
  const op = (name: string) => vi.fn((args?: unknown) => (ops.push(name), { name, args }))
  const notificationResponse = {
    updateMany: op('responses.updateMany'),
    deleteMany: op('responses.deleteMany'),
  }
  const prismaService = {
    miniApp: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({ icon: null }),
      delete: op('miniApp.delete'),
    },
    notificationResponse,
    miniAppUser: { deleteMany: op('user.deleteMany') },
    miniAppInvite: { deleteMany: op('invite.deleteMany') },
    miniAppRole: { deleteMany: op('role.deleteMany') },
    $transaction: vi.fn(async (items: unknown[]) => items),
  } as unknown as PrismaService
  const fileService = {
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => [
      await cb({}),
      { rollback: vi.fn() },
    ]),
    getFilePathFromPublicUrl: vi.fn(),
  } as unknown as FileService
  return {
    repository: new AdminMiniAppRepository(prismaService, fileService),
    notificationResponse,
    ops,
  }
}

describe('AdminMiniAppRepository.deleteMiniApp', () => {
  test('keeps the answers: fails PENDING ones as "app deleted" and never deletes responses', async () => {
    const { repository, notificationResponse } = setup()
    const result = await repository.deleteMiniApp('app-1')
    expect(result.isOk()).toBe(true)
    expect(notificationResponse.deleteMany).not.toHaveBeenCalled()
    expect(notificationResponse.updateMany).toHaveBeenCalledWith({
      where: { miniAppId: 'app-1', deliveryStatus: 'PENDING' },
      data: expect.objectContaining({
        deliveryStatus: 'FAILED',
        lastError: 'app deleted',
        nextAttemptAt: null,
      }),
    })
  })

  test('the PENDING rows are failed in the same transaction, before the app is deleted', async () => {
    const { repository, ops } = setup()
    await repository.deleteMiniApp('app-1')
    expect(ops.indexOf('responses.updateMany')).toBeGreaterThanOrEqual(0)
    expect(ops.indexOf('responses.updateMany')).toBeLessThan(ops.indexOf('miniApp.delete'))
  })
})
