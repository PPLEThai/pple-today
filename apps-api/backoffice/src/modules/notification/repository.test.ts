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
      supportsTrayInteraction: boolean
    }[]
  }[] = []
) => {
  const prismaService = {
    notificationApiKey: {
      findUnique: vi.fn(
        async (_args: {
          where: { apiKey: string; active: boolean }
          select: { source: boolean; miniApp: { select: Record<string, boolean> } }
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
      findUnique: vi.fn(async (_args: unknown) => null as { notificationTokens: unknown[] } | null),
      count: vi.fn(async (_args: unknown) => 0),
    },
    userNotification: {
      findMany: vi.fn(async (_args: unknown) => []),
      findUniqueOrThrow: vi.fn(async (_args: unknown) => ({})),
      createMany: vi.fn(async (_args: unknown) => ({ count: users.length })),
      // The badge counts, read after the rows are written — so every recipient
      // is at least one unread deep. Overridden where a test needs recipients
      // to differ from each other.
      groupBy: vi.fn(async (_args: unknown) =>
        users.map((u) => ({ userId: u.id, _count: { _all: 1 } }))
      ),
    },
    notificationApiKeyUsageLog: {
      create: vi.fn(async (_args: unknown) => ({ id: 'usage-log-id' })),
    },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  }

  const cloudMessagingService = {
    sendNotifications: vi.fn(
      async (
        _targets: unknown[],
        _data: {
          app?: { name: string; icon: string | null }
          unreadCount?: number
          interaction?: unknown
        }
      ) => ok()
    ),
  }
  const smsService = { sendSms: vi.fn(async (_phoneNumber: string, _text: string) => ok()) }
  const loggerService = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }

  return {
    prismaService,
    cloudMessagingService,
    smsService,
    repository: new NotificationRepository(
      prismaService as unknown as PrismaService,
      cloudMessagingService as unknown as CloudMessagingService,
      smsService as unknown as SmsService,
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
    // The key's own `source` decides which path it may use and whether it is
    // metered; the app's name/icon are what the send path puts in the tray — all
    // needed the moment the key is known to be valid. The app's *own* source is
    // deliberately absent: it answers no question on this path any more.
    expect(args.select.source).toBe(true)
    expect(args.select.miniApp.select).toEqual({ id: true, name: true, icon: true, slug: true })
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

  test('records the tray capability on both branches, and defaults it off', async () => {
    const { prismaService, repository } = createRepository()

    await repository.registerDeviceToken('user-id', 'device-token', {
      platform: NotificationTokenPlatform.ANDROID,
      supportsTrayInteraction: true,
    })
    await repository.registerDeviceToken('user-id', 'older-token')

    const [asserted] = prismaService.userNotificationToken.upsert.mock.calls[0]
    for (const branch of [asserted.create, asserted.update]) {
      expect(branch.supportsTrayInteraction).toBe(true)
    }
    const [older] = prismaService.userNotificationToken.upsert.mock.calls[1]
    for (const branch of [older.create, older.update]) {
      expect(branch.supportsTrayInteraction).toBe(false)
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

describe('NotificationRepository.unregisterDeviceToken', () => {
  test("removes only the caller's own registration of the token", async () => {
    // Scoped by user: if the device has since been re-registered by someone
    // else, a late logout from the previous user must not remove their row.
    const { prismaService, repository } = createRepository()
    prismaService.userNotificationToken.deleteMany.mockResolvedValue({ count: 1 })

    const result = await repository.unregisterDeviceToken('user-id', 'device-token')

    expect(result.isOk()).toBe(true)
    expect(prismaService.userNotificationToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-id', token: 'device-token' },
    })
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
        supportsTrayInteraction: true,
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
    // ...and so does the owner, because the tray response token is per user.
    expect(targets).toEqual(
      recipient.notificationTokens.map((token) => ({ ...token, userId: recipient.id }))
    )
    expect(details.app).toEqual({ name: BOUND_APP.name, icon: BOUND_APP.icon })
  })

  test('a platform send names no app in the push', async () => {
    const { cloudMessagingService, repository } = createRepository([recipient])

    await repository.sendNotificationToUser({ type: 'BROADCAST' }, CONTENT)

    const [, details] = cloudMessagingService.sendNotifications.mock.calls[0]
    expect(details.app).toBeUndefined()
  })

  test('gives each recipient their own unread total for the app icon badge', async () => {
    // The one per-recipient field on a per-send payload: the same broadcast
    // leaves one person on 1 and another on 12, and a badge showing the
    // audience's count rather than yours would be worse than none.
    const other = { ...recipient, id: 'other-user-id', phoneNumber: '+66898765432' }
    const { prismaService, cloudMessagingService, repository } = createRepository([
      recipient,
      other,
    ])
    prismaService.userNotification.groupBy.mockResolvedValue([
      { userId: other.id, _count: { _all: 12 } },
      { userId: recipient.id, _count: { _all: 1 } },
    ])

    await repository.sendNotificationToUser({ type: 'BROADCAST' }, CONTENT)

    const badges = cloudMessagingService.sendNotifications.mock.calls.map(
      ([, details]) => details.unreadCount
    )
    expect(badges).toEqual([1, 12])
  })

  test('counts the notification being sent, so the badge matches the inbox', async () => {
    // Read after the `UserNotification` rows are written. A badge one behind the
    // notification centre is the bug this ordering exists to avoid.
    const { prismaService, cloudMessagingService, repository } = createRepository([recipient])

    await repository.sendNotificationToUser({ type: 'BROADCAST' }, CONTENT)

    expect(prismaService.userNotification.createMany).toHaveBeenCalledBefore(
      prismaService.userNotification.groupBy
    )
    const [, details] = cloudMessagingService.sendNotifications.mock.calls[0]
    expect(details.unreadCount).toBe(1)
  })

  test('a count that cannot be read costs the badge, never the notification', async () => {
    // Leaving the OS showing a stale number beats failing a send over the least
    // load-bearing part of it.
    const { prismaService, cloudMessagingService, repository } = createRepository([recipient])
    prismaService.userNotification.groupBy.mockRejectedValue(new Error('connection lost'))

    const result = await repository.sendNotificationToUser({ type: 'BROADCAST' }, CONTENT)

    expect(result.isOk()).toBe(true)
    const [, details] = cloudMessagingService.sendNotifications.mock.calls[0]
    expect(details.unreadCount).toBeUndefined()
  })

  test('a SUB audience is looked up by user id across every account', async () => {
    const { prismaService, repository } = createRepository([recipient])

    await repository.sendNotificationToUser(
      { type: 'SUB', details: ['  user-id  ', 'missing-sub'] },
      CONTENT,
      { app: BOUND_APP }
    )

    const [args] = prismaService.user.findMany.mock.calls[0] as [{ where: unknown }]
    expect(args.where).toEqual({ id: { in: ['user-id', 'missing-sub'] } })
    expect(prismaService.notification.create.mock.calls[0][0].data.miniAppId).toBe(BOUND_APP.id)
  })

  test('texts an account named by sub when it has no push token, and never a sub that matches nobody', async () => {
    const noToken = {
      id: 'no-token-sub',
      phoneNumber: '+66800000000',
      notificationTokens: [],
    }
    const { smsService, repository } = createRepository([recipient, noToken])

    const result = await repository.sendNotificationToUser(
      { type: 'SUB', details: ['user-id', 'no-token-sub', 'missing-sub'] },
      CONTENT,
      { smsFallbackText: 'open PPLE Today' }
    )

    expect(result._unsafeUnwrap().delivery).toEqual({
      success: ['user-id', 'no-token-sub'],
      failed: ['missing-sub'],
    })
    // The account that already has a token is pushed, not texted. The unknown
    // sub has no number to text.
    expect(smsService.sendSms).toHaveBeenCalledTimes(1)
    expect(smsService.sendSms).toHaveBeenCalledWith('+66800000000', 'open PPLE Today')
  })

  test('a phone number with no account is still texted', async () => {
    const { smsService, repository } = createRepository([])

    const result = await repository.sendNotificationToUser(
      { type: 'PHONE_NUMBER', details: ['0812345678'] },
      CONTENT,
      { smsFallbackText: 'install the app' }
    )

    expect(result._unsafeUnwrap().delivery).toEqual({ success: [], failed: ['+66812345678'] })
    expect(smsService.sendSms).toHaveBeenCalledWith('+66812345678', 'install the app')
  })

  describe('an interactive send', () => {
    const SPEC = {
      v: 1 as const,
      ref: 'leave:123',
      fields: [],
      actions: [{ id: 'ok', label: 'OK', style: 'primary' as const }],
      tray: true,
    }
    const EXPIRES = new Date('2026-11-17T00:00:00.000Z')

    test('stores the spec and lifts the expiry into its own column', async () => {
      const { prismaService, repository } = createRepository([recipient])

      await repository.sendNotificationToUser({ type: 'BROADCAST' }, CONTENT, {
        app: BOUND_APP,
        interaction: { spec: SPEC, expiresAt: EXPIRES },
      })

      const [args] = prismaService.notification.create.mock.calls[0]
      expect(args.data.interaction).toEqual(SPEC)
      expect(args.data.interactionExpiresAt).toEqual(EXPIRES)
    })

    test('a plain send stores no interaction', async () => {
      const { prismaService, repository } = createRepository([recipient])

      await repository.sendNotificationToUser({ type: 'BROADCAST' }, CONTENT)

      const [args] = prismaService.notification.create.mock.calls[0]
      expect(args.data.interaction).toBeUndefined()
      expect(args.data.interactionExpiresAt).toBeUndefined()
    })

    test('carries the spec into the push, but never into the log', async () => {
      const { cloudMessagingService, repository } = createRepository([recipient])

      await repository.sendNotificationToUser({ type: 'BROADCAST' }, CONTENT, {
        app: BOUND_APP,
        interaction: { spec: SPEC, expiresAt: EXPIRES },
      })

      const [, details] = cloudMessagingService.sendNotifications.mock.calls[0]
      expect(details.interaction).toEqual({ spec: SPEC, expiresAt: EXPIRES })
    })

    test('uses the id it was given, and reports the id it created', async () => {
      const { prismaService, repository } = createRepository([recipient])

      const result = await repository.sendNotificationToUser({ type: 'BROADCAST' }, CONTENT, {
        notificationId: 'chosen-id',
      })

      const [args] = prismaService.notification.create.mock.calls[0]
      expect(args.data.id).toBe('chosen-id')
      expect(result._unsafeUnwrap().notificationId).toBe('new-notification-id')
    })
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

describe('NotificationRepository.getAppInstallStatus', () => {
  test('reports no account and no push for a number nobody holds', async () => {
    const { repository } = createRepository()

    const result = await repository.getAppInstallStatus('+66899999999')

    expect(result._unsafeUnwrap()).toEqual({ isAppInstalled: false, hasPushToken: false })
  })

  // The case the two flags exist for: a PPLE Today account whose phone cannot
  // be reached — notification permission refused, or the app since uninstalled
  // and its token dropped by the send path.
  test('reports an account with no live token as installed but unreachable', async () => {
    const { prismaService, repository } = createRepository()
    prismaService.user.findUnique.mockResolvedValue({ notificationTokens: [] })

    const result = await repository.getAppInstallStatus('+66812345678')

    expect(result._unsafeUnwrap()).toEqual({ isAppInstalled: true, hasPushToken: false })
  })

  test('reports both true once a token exists', async () => {
    const { prismaService, repository } = createRepository()
    prismaService.user.findUnique.mockResolvedValue({ notificationTokens: [{ token: 'fcm-1' }] })

    const result = await repository.getAppInstallStatus('+66812345678')

    expect(result._unsafeUnwrap()).toEqual({ isAppInstalled: true, hasPushToken: true })
  })

  test('matches the whole number exactly and reads at most one token', async () => {
    const { prismaService, repository } = createRepository()

    await repository.getAppInstallStatus('+66812345678')

    // findUnique on the unique column — never a prefix search — and the tokens
    // narrowed to the single row that settles the question.
    expect(prismaService.user.findUnique).toHaveBeenCalledWith({
      where: { phoneNumber: '+66812345678' },
      select: { notificationTokens: { select: { token: true }, take: 1 } },
    })
  })
})

describe('NotificationRepository.countAppInstall', () => {
  // The two counts are told apart by the token filter, which is what makes
  // `withPushToken` the same rule as `hasPushToken` on the single-number path.
  const hasTokenFilter = (args: unknown) =>
    (args as { where: { notificationTokens?: unknown } }).where.notificationTokens !== undefined

  test('counts accounts and push-reachable accounts with one query each', async () => {
    const { prismaService, repository } = createRepository()
    prismaService.user.count.mockImplementation(async (args) => (hasTokenFilter(args) ? 2 : 3))

    const result = await repository.countAppInstall([
      '+66812345678',
      '+66823456789',
      '+66834567890',
    ])

    expect(result._unsafeUnwrap()).toEqual({ withAccount: 3, withPushToken: 2 })
    expect(prismaService.user.count).toHaveBeenCalledTimes(2)
    expect(prismaService.user.count).toHaveBeenCalledWith({
      where: { phoneNumber: { in: ['+66812345678', '+66823456789', '+66834567890'] } },
    })
    expect(prismaService.user.count).toHaveBeenCalledWith({
      where: {
        phoneNumber: { in: ['+66812345678', '+66823456789', '+66834567890'] },
        notificationTokens: { some: {} },
      },
    })
  })

  test('reports zeros when no number is held', async () => {
    const { repository } = createRepository()

    const result = await repository.countAppInstall(['+66899999999'])

    expect(result._unsafeUnwrap()).toEqual({ withAccount: 0, withPushToken: 0 })
  })

  // 12000 numbers is three chunks of at most 5000, and the counts add across
  // them — without ever issuing a query per number.
  test('chunks a long list and sums the chunk counts', async () => {
    const { prismaService, repository } = createRepository()
    prismaService.user.count.mockImplementation(async (args) => (hasTokenFilter(args) ? 1 : 2))
    const numbers = Array.from({ length: 12000 }, (_, i) => `+668${String(i).padStart(8, '0')}`)

    const result = await repository.countAppInstall(numbers)

    expect(result._unsafeUnwrap()).toEqual({ withAccount: 6, withPushToken: 3 })
    expect(prismaService.user.count).toHaveBeenCalledTimes(6)
    const sizes = prismaService.user.count.mock.calls.map(
      ([args]) => (args as { where: { phoneNumber: { in: string[] } } }).where.phoneNumber.in.length
    )
    expect(sizes.sort((a, b) => a - b)).toEqual([2000, 2000, 5000, 5000, 5000, 5000])
  })

  test('never reads a row back, only counts', async () => {
    const { prismaService, repository } = createRepository()

    await repository.countAppInstall(['+66812345678'])

    expect(prismaService.user.findMany).not.toHaveBeenCalled()
    expect(prismaService.user.findUnique).not.toHaveBeenCalled()
  })
})

describe('NotificationRepository reads for the interaction state', () => {
  test('the history list fetches the caller’s own response and the app’s retirement in the same query', async () => {
    const { prismaService, repository } = createRepository()

    await repository.listNotifications('user-id')

    const [args] = prismaService.userNotification.findMany.mock.calls[0] as [
      { include: { notification: { include: Record<string, any> } } },
    ]
    const include = args.include.notification.include
    // One joined query for the page, not one lookup per row.
    expect(include.responses.where).toEqual({ userId: 'user-id' })
    expect(include.miniApp.select.retiredAt).toBe(true)
  })

  test('the detail read fetches only the caller’s own response', async () => {
    const { prismaService, repository } = createRepository()

    await repository.getNotificationDetailsById('user-id', 'notification-id')

    const [args] = prismaService.userNotification.findUniqueOrThrow.mock.calls[0] as [
      { include: { notification: { include: Record<string, any> } } },
    ]
    expect(args.include.notification.include.responses.where).toEqual({ userId: 'user-id' })
  })
})
