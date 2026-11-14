import type { PrismaService } from '@pple-today/api-common/services'
import { NotificationTokenPlatform, Prisma } from '@pple-today/database/prisma'
import { PrismaClientKnownRequestError } from '@pple-today/database/prisma/runtime/client'
import { describe, expect, test, vi } from 'vitest'

import { InteractionRepository } from './interaction-repository'
import { deviceHash } from './response-token'

const createRepository = () => {
  const prismaService: Record<string, any> = {
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
      findUnique: vi.fn(async (_args: Record<string, any>) => null as unknown),
      findUniqueOrThrow: vi.fn(async (_args: unknown) => ({
        interactionClosedAt: null as Date | null,
      })),
    },
    $queryRaw: vi.fn(async (..._args: unknown[]) => [] as unknown[]),
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaService)),
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

  const open = {
    miniAppId: 'app-id',
    interactionClosedAt: null as Date | null,
    interactionExpiresAt: null as Date | null,
    miniApp: { retiredAt: null as Date | null } as { retiredAt: Date | null } | null,
  }
  const input = {
    notificationId: 'notification-id',
    userId: 'user-id',
    actionId: 'approve',
    values: undefined,
    channel: 'TRAY' as const,
    now: new Date('2026-11-10T00:00:00Z'),
  }

  test('locks the notification, re-checks, records the answer and marks it read in one transaction', async () => {
    const { prismaService, repository } = createRepository()
    prismaService.notification.findUnique.mockResolvedValue(open)

    const result = await repository.createResponse(input)

    expect(prismaService.$transaction).toHaveBeenCalledOnce()
    const order = [
      prismaService.$queryRaw.mock.invocationCallOrder[0],
      prismaService.notification.findUnique.mock.invocationCallOrder[0],
      prismaService.notificationResponse.create.mock.invocationCallOrder[0],
      prismaService.userNotification.updateMany.mock.invocationCallOrder[0],
    ]
    expect(order).toEqual([...order].sort((a, b) => a - b))
    const [strings, ...values] = prismaService.$queryRaw.mock.calls[0] as unknown as [
      string[],
      ...unknown[],
    ]
    expect(strings.join('?')).toMatch(/FOR UPDATE/)
    expect(values).toEqual(['notification-id'])

    const created = prismaService.notificationResponse.create.mock.calls[0][0].data
    expect(created).toMatchObject({
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
    expect(result._unsafeUnwrap()).toMatchObject({ status: 'CREATED' })
  })

  test('sets nextAttemptAt from the app clock, not the database default', async () => {
    const { prismaService, repository } = createRepository()
    prismaService.notification.findUnique.mockResolvedValue(open)
    const before = Date.now()

    await repository.createResponse(input)

    const { nextAttemptAt } = prismaService.notificationResponse.create.mock.calls[0][0].data
    expect(nextAttemptAt).toBeInstanceOf(Date)
    expect(nextAttemptAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(nextAttemptAt.getTime()).toBeLessThanOrEqual(Date.now())
  })

  test('keeps an admin-portal answer here: never PENDING, so the sweep never claims it', async () => {
    const { prismaService, repository } = createRepository()
    prismaService.notification.findUnique.mockResolvedValue({
      ...open,
      miniAppId: null,
      miniApp: null,
      origin: 'ADMIN_PORTAL',
    })

    const result = await repository.createResponse(input)

    expect(result._unsafeUnwrap()).toMatchObject({ status: 'CREATED' })
    const created = prismaService.notificationResponse.create.mock.calls[0][0].data
    expect(created).toMatchObject({ miniAppId: null, deliveryStatus: 'NONE', nextAttemptAt: null })
  })

  test('an app answer is left PENDING for delivery', async () => {
    const { prismaService, repository } = createRepository()
    prismaService.notification.findUnique.mockResolvedValue({ ...open, origin: 'API' })

    await repository.createResponse(input)

    const created = prismaService.notificationResponse.create.mock.calls[0][0].data
    expect(created.deliveryStatus).toBeUndefined()
  })

  test.each([
    ['closed', { interactionClosedAt: new Date('2026-11-09') }, 'CLOSED'],
    ['expired', { interactionExpiresAt: new Date('2026-11-09') }, 'EXPIRED'],
    ['from a retired app', { miniApp: { retiredAt: new Date('2026-11-01') } }, 'CLOSED'],
    ['from a deleted app', { miniAppId: null, miniApp: null }, 'CLOSED'],
  ])('writes nothing when the locked re-check finds it %s', async (_n, overrides, status) => {
    const { prismaService, repository } = createRepository()
    prismaService.notification.findUnique.mockResolvedValue({ ...open, ...overrides })

    const result = await repository.createResponse(input)

    expect(result._unsafeUnwrap()).toEqual({ status })
    expect(prismaService.notificationResponse.create).not.toHaveBeenCalled()
    expect(prismaService.userNotification.updateMany).not.toHaveBeenCalled()
  })

  test('a unique violation inside the transaction surfaces as UNIQUE_CONSTRAINT_FAILED', async () => {
    const { prismaService, repository } = createRepository()
    prismaService.notification.findUnique.mockResolvedValue(open)
    prismaService.notificationResponse.create.mockRejectedValue(
      new PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' })
    )

    const result = await repository.createResponse(input)

    expect(result._unsafeUnwrapErr().code).toBe('UNIQUE_CONSTRAINT_FAILED')
  })

  test('a device is found by the hash of any of the user’s tokens', async () => {
    const { prismaService, repository } = createRepository()
    prismaService.userNotificationToken.findMany.mockResolvedValue([
      { token: 'a' },
      { token: 'fcm-b' },
    ])

    expect(
      (await repository.hasDeviceWithHash('user-id', deviceHash('fcm-b')))._unsafeUnwrap()
    ).toBe(true)
    expect(
      (await repository.hasDeviceWithHash('user-id', deviceHash('fcm-gone')))._unsafeUnwrap()
    ).toBe(false)
    expect(prismaService.userNotificationToken.findMany.mock.calls[0][0].where).toEqual({
      userId: 'user-id',
    })
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
