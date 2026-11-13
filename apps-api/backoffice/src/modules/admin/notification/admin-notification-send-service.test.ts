import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err, ok } from 'neverthrow'
import { describe, expect, test, vi } from 'vitest'

import {
  AdminNotificationSendService,
  normalizePhoneNumbers,
  toPipelineAudience,
  toSentAudience,
  toSentInteractionState,
} from './admin-notification-send-service'
import type { AdminSendNotificationBody } from './models'
import type { SentNotificationRow } from './sent-repository'

const NOW = new Date('2026-11-13T04:00:00.000Z')
const ORIGIN = 'https://apps.example'
const ADMIN = { userId: 'admin-1' }

const createService = (options: { interactive?: boolean } = {}) => {
  const sentRepository = {
    findMiniAppSlug: vi.fn(async (_id: string) =>
      ok({ slug: 'volunteer' } as { slug: string } | null)
    ),
    listRoles: vi.fn(async () => ok([{ role: 'member', userCount: 3 }])),
    publishImage: vi.fn(async (path: string) => ok(`https://cdn.example/${path}`)),
    countRecipients: vi.fn(async (_id: string) => ok(42)),
    listSent: vi.fn(),
    getSent: vi.fn(),
    listResponses: vi.fn(),
  }
  const notificationRepository = {
    sendNotificationToUser: vi.fn(
      async (..._args: unknown[]) =>
        ok({ notificationId: 'n-1', delivery: undefined }) as unknown as ReturnType<
          AdminNotificationSendService['send']
        >
    ),
    countAudience: vi.fn(async (_audience: unknown) =>
      ok({ userCount: 10, pushReachableCount: 7 })
    ),
  }
  const service = new AdminNotificationSendService(
    sentRepository as never,
    notificationRepository as never,
    {
      miniAppRedirectOrigin: ORIGIN,
      interactiveNotificationsEnabled: options.interactive ?? true,
      now: () => NOW,
    }
  )
  return { service, sentRepository, notificationRepository }
}

const body = (overrides: Partial<AdminSendNotificationBody> = {}): AdminSendNotificationBody => ({
  audience: { type: 'BROADCAST' },
  content: { header: 'หัวข้อ', message: 'ข้อความ' },
  ...overrides,
})

const sentArgs = (repo: ReturnType<typeof createService>['notificationRepository']) =>
  repo.sendNotificationToUser.mock.calls[0] as unknown as [
    unknown,
    Record<string, any>,
    Record<string, any>,
  ]

const codeOf = (result: { _unsafeUnwrapErr(): { code: string } }) => result._unsafeUnwrapErr().code

describe('normalizePhoneNumbers', () => {
  test('canonicalises both spellings to one person and skips blank lines', () => {
    expect(normalizePhoneNumbers(['0812345678', ' +66812345678 ', '', '0898765432'])).toEqual({
      valid: ['+66812345678', '+66898765432'],
      invalid: [],
    })
  })

  test('reports malformed entries as written', () => {
    expect(normalizePhoneNumbers(['12345', '0812345678']).invalid).toEqual(['12345'])
  })
})

describe('toPipelineAudience', () => {
  test('an audience that names nobody is refused, never widened', () => {
    for (const audience of [
      { type: 'ROLE' as const, roles: [' '] },
      { type: 'ADDRESS' as const, provinces: [], districts: [] },
      { type: 'PHONE_NUMBER' as const, phoneNumbers: [''] },
    ]) {
      expect(codeOf(toPipelineAudience(audience))).toBe(
        InternalErrorCode.NOTIFICATION_INVALID_RECIPIENTS
      )
    }
  })

  test('one malformed number refuses the whole send', () => {
    const result = toPipelineAudience({
      type: 'PHONE_NUMBER',
      phoneNumbers: ['0812345678', 'abc'],
    })
    expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_INVALID_RECIPIENTS)
    expect(result._unsafeUnwrapErr().message).toContain('abc')
  })

  test('maps each kind to the pipeline shape', () => {
    expect(toPipelineAudience({ type: 'ROLE', roles: ['a', 'a', 'b'] })._unsafeUnwrap()).toEqual({
      type: 'ROLE',
      details: ['a', 'b'],
    })
    expect(
      toPipelineAudience({
        type: 'ADDRESS',
        provinces: ['กรุงเทพมหานคร'],
        districts: [],
      })._unsafeUnwrap()
    ).toEqual({ type: 'ADDRESS', details: { provinces: ['กรุงเทพมหานคร'], districts: [] } })
  })
})

describe('AdminNotificationSendService.send', () => {
  test('sends as PPLE Today, recorded as an admin-portal send by this admin', async () => {
    const { service, notificationRepository } = createService()

    const result = await service.send(body(), ADMIN)

    expect(result._unsafeUnwrap()).toEqual({ notificationId: 'n-1', recipientCount: 42 })
    const [audience, content, options] = sentArgs(notificationRepository)
    expect(audience).toEqual({ type: 'BROADCAST' })
    expect(content).toMatchObject({ header: 'หัวข้อ', message: 'ข้อความ', link: undefined })
    expect(options.sentFromAdminPortal).toEqual(ADMIN)
    // No sender app and no API key: nothing about it is app-bound or metered.
    expect(options.app).toBeUndefined()
    expect(options.apiKeyId).toBeUndefined()
  })

  test('builds a mini-app link from the app’s slug and the path', async () => {
    const { service, notificationRepository, sentRepository } = createService()

    await service.send(
      body({
        link: {
          type: 'MINI_APP',
          miniAppId: 'app-1',
          path: '/tasks/9',
          bypassNotificationCenter: true,
        },
      }),
      ADMIN
    )

    expect(sentRepository.findMiniAppSlug).toHaveBeenCalledWith('app-1')
    expect(sentArgs(notificationRepository)[1].link).toEqual({
      type: 'MINI_APP',
      destination: `${ORIGIN}/volunteer/tasks/9`,
      bypassNotificationCenter: true,
    })
  })

  test('a mini-app link with no path opens the app’s entry', async () => {
    const { service, notificationRepository } = createService()

    await service.send(body({ link: { type: 'MINI_APP', miniAppId: 'app-1' } }), ADMIN)

    expect(sentArgs(notificationRepository)[1].link.destination).toBe(`${ORIGIN}/volunteer`)
  })

  test('an unknown or retired mini app is refused', async () => {
    const { service, sentRepository, notificationRepository } = createService()
    sentRepository.findMiniAppSlug.mockResolvedValue(ok(null))

    const result = await service.send(
      body({ link: { type: 'MINI_APP', miniAppId: 'gone' } }),
      ADMIN
    )

    expect(codeOf(result)).toBe(InternalErrorCode.MINI_APP_NOT_FOUND)
    expect(notificationRepository.sendNotificationToUser).not.toHaveBeenCalled()
  })

  test('an entity in-app link needs its id; a screen takes none', async () => {
    const { service, notificationRepository } = createService()

    const missing = await service.send(
      body({ link: { type: 'IN_APP_NAVIGATION', inAppType: 'POST', inAppId: ' ' } }),
      ADMIN
    )
    expect(codeOf(missing)).toBe(InternalErrorCode.NOTIFICATION_INVALID_IN_APP_NAVIGATION)

    await service.send(
      body({ link: { type: 'IN_APP_NAVIGATION', inAppType: 'ACTIVITY', inAppId: 'ignored' } }),
      ADMIN
    )
    expect(sentArgs(notificationRepository)[1].link).toEqual({
      type: 'IN_APP_NAVIGATION',
      destination: { inAppType: 'ACTIVITY', inAppId: '' },
      bypassNotificationCenter: undefined,
    })
  })

  test('the Beta invite marker is not a destination', async () => {
    const { service } = createService()

    const result = await service.send(
      body({ link: { type: 'IN_APP_NAVIGATION', inAppType: 'MINI_APP_INVITE' } }),
      ADMIN
    )

    expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_INVALID_IN_APP_NAVIGATION)
  })

  test('the button label is dropped when there is no link', async () => {
    const { service, notificationRepository } = createService()

    await service.send(
      body({ content: { header: 'h', message: 'm', actionButtonText: 'ดู' } }),
      ADMIN
    )

    expect(sentArgs(notificationRepository)[1].actionButtonText).toBeUndefined()
  })

  test('SMS fallback is only for phone-number sends', async () => {
    const { service, notificationRepository } = createService()

    const refused = await service.send(body({ smsFallbackText: 'hi' }), ADMIN)
    expect(codeOf(refused)).toBe(InternalErrorCode.BAD_REQUEST)

    await service.send(
      body({
        audience: { type: 'PHONE_NUMBER', phoneNumbers: ['0812345678'] },
        smsFallbackText: 'hi',
      }),
      ADMIN
    )
    const [audience, , options] = sentArgs(notificationRepository)
    expect(audience).toEqual({ type: 'PHONE_NUMBER', details: ['+66812345678'] })
    expect(options.smsFallbackText).toBe('hi')
  })

  test('reports which numbers matched an account', async () => {
    const { service, notificationRepository } = createService()
    const delivery = { success: ['+66812345678'], failed: ['+66898765432'] }
    notificationRepository.sendNotificationToUser.mockResolvedValue(
      ok({ notificationId: 'n-1', delivery }) as never
    )

    const result = await service.send(
      body({ audience: { type: 'PHONE_NUMBER', phoneNumbers: ['0812345678', '0898765432'] } }),
      ADMIN
    )

    expect(result._unsafeUnwrap().phoneNumber).toEqual(delivery)
  })

  test('an interaction needs no app: its answers are collected here', async () => {
    const { service, notificationRepository } = createService()

    const result = await service.send(
      body({
        interaction: {
          expiresAt: '2026-11-13T08:00:00.000Z',
          actions: [
            { id: 'yes', label: 'ไป' },
            { id: 'no', label: 'ไม่ไป' },
          ],
          liveActivity: true,
        },
      }),
      ADMIN
    )

    expect(result.isOk()).toBe(true)
    const { interaction } = sentArgs(notificationRepository)[2]
    expect(interaction.spec.liveActivity).toBe(true)
    expect(interaction.expiresAt).toEqual(new Date('2026-11-13T08:00:00.000Z'))
  })

  test('bypass and an interaction together are refused', async () => {
    const { service } = createService()

    const result = await service.send(
      body({
        link: { type: 'IN_APP_NAVIGATION', inAppType: 'ACTIVITY', bypassNotificationCenter: true },
        interaction: { actions: [{ id: 'ok', label: 'OK' }] },
      }),
      ADMIN
    )

    expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_INTERACTION_BYPASS_NOT_ALLOWED)
  })

  test('an interaction is refused while the feature flag is off', async () => {
    const { service } = createService({ interactive: false })

    const result = await service.send(
      body({ interaction: { actions: [{ id: 'ok', label: 'OK' }] } }),
      ADMIN
    )

    expect(codeOf(result)).toBe(InternalErrorCode.INTERACTIVE_NOTIFICATIONS_DISABLED)
  })

  test('publishes the image only once the send is otherwise valid', async () => {
    const { service, sentRepository, notificationRepository } = createService()
    const imageFilePath = 'temp/notification/notification-1.png' as const

    await service.send(
      body({
        content: { header: 'h', message: 'm', imageFilePath },
        interaction: { actions: [] },
      }),
      ADMIN
    )
    expect(sentRepository.publishImage).not.toHaveBeenCalled()

    await service.send(body({ content: { header: 'h', message: 'm', imageFilePath } }), ADMIN)
    expect(sentRepository.publishImage).toHaveBeenCalledWith(imageFilePath)
    expect(sentArgs(notificationRepository)[1].image).toBe(`https://cdn.example/${imageFilePath}`)
  })

  test('a failed image move stops the send', async () => {
    const { service, sentRepository, notificationRepository } = createService()
    sentRepository.publishImage.mockResolvedValue(
      err({ code: InternalErrorCode.FILE_MOVE_ERROR, message: 'x' }) as never
    )

    const result = await service.send(
      body({ content: { header: 'h', message: 'm', imageFilePath: 'temp/x.png' } }),
      ADMIN
    )

    expect(codeOf(result)).toBe(InternalErrorCode.FILE_MOVE_ERROR)
    expect(notificationRepository.sendNotificationToUser).not.toHaveBeenCalled()
  })
})

describe('AdminNotificationSendService.sendTest', () => {
  test('goes to the admin’s own account only, as an admin-portal send, never by SMS', async () => {
    const { service, notificationRepository } = createService()

    const result = await service.sendTest(
      {
        content: { header: 'h', message: 'm' },
        interaction: { actions: [{ id: 'ok', label: 'OK' }] },
      },
      ADMIN
    )

    expect(result._unsafeUnwrap()).toEqual({ notificationId: 'n-1', hasPushToken: true })
    const [audience, , options] = sentArgs(notificationRepository)
    expect(audience).toEqual({ type: 'USER_ID', details: [ADMIN.userId] })
    expect(options.sentFromAdminPortal).toEqual(ADMIN)
    expect(options.smsFallbackText).toBeUndefined()
    expect(options.interaction.spec.actions[0].id).toBe('ok')
  })

  test('says when the admin has no device to push to', async () => {
    const { service, notificationRepository } = createService()
    notificationRepository.countAudience.mockResolvedValue(
      ok({ userCount: 1, pushReachableCount: 0 })
    )

    const result = await service.sendTest({ content: { header: 'h', message: 'm' } }, ADMIN)

    expect(result._unsafeUnwrap().hasPushToken).toBe(false)
  })

  test('runs the same content checks as the real send', async () => {
    const { service, notificationRepository } = createService()

    const result = await service.sendTest(
      {
        content: { header: 'h', message: 'm' },
        link: { type: 'IN_APP_NAVIGATION', inAppType: 'POST' },
      },
      ADMIN
    )

    expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_INVALID_IN_APP_NAVIGATION)
    expect(notificationRepository.sendNotificationToUser).not.toHaveBeenCalled()
  })
})

describe('AdminNotificationSendService.countAudience', () => {
  test('counts the well-formed numbers and lists the rest', async () => {
    const { service, notificationRepository } = createService()

    const result = await service.countAudience({
      type: 'PHONE_NUMBER',
      phoneNumbers: ['0812345678', 'oops'],
    })

    expect(result._unsafeUnwrap()).toEqual({
      userCount: 10,
      pushReachableCount: 7,
      invalidPhoneNumbers: ['oops'],
    })
    expect(notificationRepository.countAudience).toHaveBeenCalledWith({
      type: 'PHONE_NUMBER',
      details: ['+66812345678'],
    })
  })

  test('an empty selection counts zero without a query', async () => {
    const { service, notificationRepository } = createService()

    const result = await service.countAudience({ type: 'ROLE', roles: [] })

    expect(result._unsafeUnwrap()).toEqual({
      userCount: 0,
      pushReachableCount: 0,
      invalidPhoneNumbers: [],
    })
    expect(notificationRepository.countAudience).not.toHaveBeenCalled()
  })
})

describe('reading back what was sent', () => {
  const counts = { sentNotifications: 0, responses: 0, phoneNumbers: 0 }
  const row = (overrides: Partial<SentNotificationRow> = {}) =>
    ({
      isBroadcast: false,
      roles: [],
      provinces: [],
      districts: [],
      _count: counts,
      interaction: null,
      interactionClosedAt: null,
      interactionExpiresAt: null,
      ...overrides,
    }) as SentNotificationRow

  test('recovers the audience kind from the stored columns', () => {
    expect(toSentAudience(row({ isBroadcast: true }))).toEqual({ type: 'BROADCAST' })
    expect(toSentAudience(row({ roles: ['a'] }))).toEqual({ type: 'ROLE', roles: ['a'] })
    expect(toSentAudience(row({ districts: ['บางรัก'] }))).toEqual({
      type: 'ADDRESS',
      provinces: [],
      districts: ['บางรัก'],
    })
    // Only a test send (to the sender, by user id) sets no audience column.
    expect(toSentAudience(row())).toEqual({ type: 'TEST' })
    expect(toSentAudience(row({ _count: { ...counts, phoneNumbers: 3 } }))).toEqual({
      type: 'PHONE_NUMBER',
      phoneNumberCount: 3,
    })
  })

  test('the interaction state is the notification’s, never one recipient’s', () => {
    const spec = { v: 1, fields: [], actions: [], tray: true }
    expect(toSentInteractionState(row(), NOW)).toBeNull()
    expect(toSentInteractionState(row({ interaction: spec }), NOW)).toBe('OPEN')
    expect(toSentInteractionState(row({ interaction: spec, interactionClosedAt: NOW }), NOW)).toBe(
      'CLOSED'
    )
    expect(
      toSentInteractionState(
        row({ interaction: spec, interactionExpiresAt: new Date('2026-11-12') }),
        NOW
      )
    ).toBe('EXPIRED')
  })
})
