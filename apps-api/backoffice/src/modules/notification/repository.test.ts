import type { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import type { PrismaService } from '@pple-today/api-common/services'
import { MiniAppSource, NotificationTokenPlatform } from '@pple-today/database/prisma'
import { ok } from 'neverthrow'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { NotificationRepository } from './repository'

import type { CloudMessagingService } from '../../plugins/cloud-messaging'
import type { SmsService } from '../../plugins/sms'

const BOUND_APP = {
  id: 'mini-app-id',
  source: MiniAppSource.PLATFORM,
  name: 'Canvassing',
  icon: 'https://cdn.example/canvassing.png',
}

const CONTENT = { header: 'Canvassing today', message: 'Three streets left in Bang Rak' }

const createRepository = (
  users: {
    id: string
    phoneNumber: string
    notificationTokens: {
      token: string
      platform: NotificationTokenPlatform | null
      supportsAppBranding: boolean
    }[]
  }[] = []
) => {
  const prismaService = {
    notificationApiKey: {
      findUnique: vi.fn(
        async (_args: {
          where: { apiKey: string; active: boolean }
          select: { miniApp: { select: Record<string, boolean> } }
        }) => null
      ),
    },
    userNotificationToken: {
      upsert: vi.fn(
        async (_args: { create: Record<string, unknown>; update: Record<string, unknown> }) => ({})
      ),
      deleteMany: vi.fn(async (_args: unknown) => ({ count: 0 })),
    },
    notification: {
      create: vi.fn(async (_args: { data: Record<string, unknown> }) => ({
        id: 'new-notification-id',
      })),
    },
    user: {
      findMany: vi.fn(async (_args: unknown) => users),
    },
    userNotification: {
      createMany: vi.fn(async (_args: unknown) => ({ count: users.length })),
    },
    notificationApiKeyUsageLog: {
      create: vi.fn(async (_args: unknown) => ({ id: 'usage-log-id' })),
    },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  }

  const cloudMessagingService = {
    sendNotifications: vi.fn(
      async (_targets: unknown[], _data: { app?: { name: string; icon: string | null } }) => ok()
    ),
  }
  const loggerService = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

  return {
    prismaService,
    cloudMessagingService,
    repository: new NotificationRepository(
      prismaService as unknown as PrismaService,
      cloudMessagingService as unknown as CloudMessagingService,
      { sendSms: vi.fn(async () => ok()) } as unknown as SmsService,
      loggerService as unknown as ElysiaLoggerInstance
    ),
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('NotificationRepository.checkApiKey', () => {
  test('resolves the bound app in the same query as the key', async () => {
    const { prismaService, repository } = createRepository()

    await repository.checkApiKey('plaintext-key')

    const [args] = prismaService.notificationApiKey.findUnique.mock.calls[0]
    // `source` decides which path the key may use and whether it is metered,
    // and name/icon are what the send path puts in the tray — all needed the
    // moment the key is known to be valid.
    expect(args.select.miniApp.select).toEqual({
      id: true,
      source: true,
      name: true,
      icon: true,
    })
  })

  test('only ever matches an active key, by hash', async () => {
    const { prismaService, repository } = createRepository()

    await repository.checkApiKey('plaintext-key')

    const [args] = prismaService.notificationApiKey.findUnique.mock.calls[0]
    expect(args.where.active).toBe(true)
    expect(args.where.apiKey).not.toBe('plaintext-key')
  })
})

describe('NotificationRepository.registerDeviceToken', () => {
  test('records the capability on the update branch, not just create', async () => {
    // The branch that matters: an upgraded install keeps its FCM token, so it
    // only ever takes `update`. Setting the columns on `create` alone would
    // mean an upgraded client could never assert the capability at all.
    const { prismaService, repository } = createRepository()

    await repository.registerDeviceToken('user-id', 'device-token', {
      platform: NotificationTokenPlatform.ANDROID,
      supportsAppBranding: true,
    })

    const [args] = prismaService.userNotificationToken.upsert.mock.calls[0]
    for (const branch of [args.create, args.update]) {
      expect(branch.platform).toBe(NotificationTokenPlatform.ANDROID)
      expect(branch.supportsAppBranding).toBe(true)
    }
  })

  test('an older client that says nothing records no platform and no branding', async () => {
    // Registration asserts what this install can do *now*, so omission is a
    // negative assertion rather than "leave whatever was there" — which also
    // makes a downgrade self-correcting.
    const { prismaService, repository } = createRepository()

    await repository.registerDeviceToken('user-id', 'device-token')

    const [args] = prismaService.userNotificationToken.upsert.mock.calls[0]
    for (const branch of [args.create, args.update]) {
      expect(branch.platform).toBeNull()
      expect(branch.supportsAppBranding).toBe(false)
    }
  })
})

describe('NotificationRepository.sendNotificationToUser', () => {
  const recipient = {
    id: 'user-id',
    phoneNumber: '+66812345678',
    notificationTokens: [
      {
        token: 'device-token',
        platform: NotificationTokenPlatform.ANDROID,
        supportsAppBranding: true,
      },
    ],
  }

  test('stamps the sending app on the notification row', async () => {
    const { prismaService, repository } = createRepository([recipient])

    await repository.sendNotificationToUser({ type: 'BROADCAST' }, CONTENT, { app: BOUND_APP })

    const [args] = prismaService.notification.create.mock.calls[0]
    expect(args.data.miniAppId).toBe(BOUND_APP.id)
  })

  test('a send with no app is PPLE Today’s own, and says so explicitly', async () => {
    const { prismaService, repository } = createRepository([recipient])

    await repository.sendNotificationToUser({ type: 'BROADCAST' }, CONTENT)

    const [args] = prismaService.notification.create.mock.calls[0]
    expect(args.data.miniAppId).toBeNull()
  })

  test('carries the app into the push, and each token’s own capability with it', async () => {
    const { cloudMessagingService, repository } = createRepository([recipient])

    await repository.sendNotificationToUser({ type: 'BROADCAST' }, CONTENT, { app: BOUND_APP })

    const [targets, details] = cloudMessagingService.sendNotifications.mock.calls[0]
    // The payload is chosen per token, so the platform and the asserted
    // capability have to survive the trip from the query to the builder.
    expect(targets).toEqual(recipient.notificationTokens)
    expect(details.app).toEqual({ name: BOUND_APP.name, icon: BOUND_APP.icon })
  })

  test('a platform send names no app in the push', async () => {
    const { cloudMessagingService, repository } = createRepository([recipient])

    await repository.sendNotificationToUser({ type: 'BROADCAST' }, CONTENT)

    const [, details] = cloudMessagingService.sendNotifications.mock.calls[0]
    expect(details.app).toBeUndefined()
  })

  test('still meters against the key when one is given', async () => {
    const { prismaService, repository } = createRepository([recipient])

    await repository.sendNotificationToUser({ type: 'BROADCAST' }, CONTENT, {
      apiKeyId: 'key-id',
      app: BOUND_APP,
    })

    expect(prismaService.notificationApiKeyUsageLog.create).toHaveBeenCalledOnce()
  })
})
