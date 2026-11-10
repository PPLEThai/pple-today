import type { PrismaService } from '@pple-today/api-common/services'
import { NotificationTokenPlatform, Prisma } from '@pple-today/database/prisma'
import { describe, expect, test, vi } from 'vitest'

import { InteractionRepository } from './interaction-repository'

const createRepository = () => {
  const prismaService = {
    userNotification: {
      findUnique: vi.fn(async (_args: Record<string, any>) => null as unknown),
      updateMany: vi.fn(async (_args: Record<string, any>) => ({ count: 1 })),
    },
    notificationResponse: {
      findUnique: vi.fn(async (_args: unknown) => null),
      create: vi.fn(async (_args: Record<string, any>) => ({ id: 'response-id' })),
    },
    userNotificationToken: {
      findMany: vi.fn(async (_args: Record<string, any>) => [{ token: 'a' }, { token: 'b' }]),
    },
    notification: {
      findFirst: vi.fn(async (_args: Record<string, any>) => null),
      updateMany: vi.fn(async (_args: Record<string, any>) => ({ count: 1 })),
      findUniqueOrThrow: vi.fn(async (_args: unknown) => ({
        interactionClosedAt: null as Date | null,
      })),
    },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  }
  return {
    prismaService,
    repository: new InteractionRepository(prismaService as unknown as PrismaService),
  }
}

describe('InteractionRepository', () => {
  test('looks the notification up by the caller’s own recipient row, with only their answer', async () => {
    const { prismaService, repository } = createRepository()

    const result = await repository.getForResponse('user-id', 'notification-id')

    const [args] = prismaService.userNotification.findUnique.mock.calls[0]
    // "Not a recipient" and "does not exist" are the same miss.
    expect(args.where).toEqual({
      userId_notificationId: { userId: 'user-id', notificationId: 'notification-id' },
    })
    expect(args.select.notification.select.responses.where).toEqual({ userId: 'user-id' })
    expect(result._unsafeUnwrap()).toBeNull()
  })

  test('records the answer and marks the notification read in one transaction', async () => {
    const { prismaService, repository } = createRepository()

    await repository.createResponse({
      notificationId: 'notification-id',
      userId: 'user-id',
      miniAppId: 'app-id',
      actionId: 'approve',
      values: undefined,
      channel: 'TRAY',
    })

    expect(prismaService.$transaction).toHaveBeenCalledOnce()
    expect(prismaService.notificationResponse.create.mock.calls[0][0].data).toMatchObject({
      notificationId: 'notification-id',
      userId: 'user-id',
      miniAppId: 'app-id',
      actionId: 'approve',
      channel: 'TRAY',
    })
    const [read] = prismaService.userNotification.updateMany.mock.calls[0]
    expect(read.where).toEqual({
      userId: 'user-id',
      notificationId: 'notification-id',
      isRead: false,
    })
    expect(read.data.isRead).toBe(true)
  })

  test('the dismiss goes to the user’s Android tray-capable devices only', async () => {
    const { prismaService, repository } = createRepository()

    const result = await repository.getTrayDismissTokens('user-id')

    expect(result._unsafeUnwrap()).toEqual(['a', 'b'])
    expect(prismaService.userNotificationToken.findMany.mock.calls[0][0].where).toEqual({
      userId: 'user-id',
      platform: NotificationTokenPlatform.ANDROID,
      supportsTrayInteraction: true,
    })
  })

  test('only the attributed app can find its interactive notification', async () => {
    const { prismaService, repository } = createRepository()

    await repository.getOwnInteraction('notification-id', 'app-id')

    expect(prismaService.notification.findFirst.mock.calls[0][0].where).toEqual({
      id: 'notification-id',
      miniAppId: 'app-id',
      interaction: { not: Prisma.DbNull },
    })
  })

  test('closing stamps the time once and never overwrites it', async () => {
    const { prismaService, repository } = createRepository()
    const first = new Date('2026-11-09T00:00:00.000Z')
    prismaService.notification.findUniqueOrThrow.mockResolvedValue({ interactionClosedAt: first })

    const result = await repository.closeInteraction('notification-id', new Date('2026-11-10'))

    expect(prismaService.notification.updateMany.mock.calls[0][0].where).toEqual({
      id: 'notification-id',
      interactionClosedAt: null,
    })
    // A concurrent close that won is reported, not clobbered.
    expect(result._unsafeUnwrap()).toEqual(first)
  })
})
