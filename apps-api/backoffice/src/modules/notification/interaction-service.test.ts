import { InternalErrorCode } from '@pple-today/api-common/dtos'
import type { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { err, ok } from 'neverthrow'
import { describe, expect, test, vi } from 'vitest'

import type { NotificationCallbackDispatcher } from './callback-delivery'
import type { InteractionRepository } from './interaction-repository'
import { InteractionService } from './interaction-service'
import { deviceHash, mintResponseToken } from './response-token'

const NOW = new Date('2026-11-10T04:00:00.000Z')
const SECRET = 'test-secret'
const NOTIFICATION_ID = 'notification-1'
const USER_ID = 'user-1'
const APP_ID = 'app-1'
const DEVICE_TOKEN = 'fcm-device-1'

const SPEC = {
  v: 1 as const,
  ref: 'leave:123',
  fields: [
    {
      id: 'note',
      type: 'text' as const,
      label: 'เหตุผล',
      required: false,
      multiline: false,
      maxLength: 500,
    },
  ],
  actions: [
    { id: 'approve', label: 'อนุมัติ', style: 'primary' as const },
    { id: 'reject', label: 'ไม่อนุมัติ', style: 'destructive' as const, requires: ['note'] },
  ],
  tray: true,
}

type Loaded = {
  interaction: unknown
  interactionExpiresAt: Date | null
  interactionClosedAt: Date | null
  miniAppId: string | null
  miniApp: { retiredAt: Date | null } | null
  origin?: 'API' | 'ADMIN_PORTAL'
  responses: { actionId: string; values: unknown; respondedAt: Date }[]
}

const openNotification = (overrides: Partial<Loaded> = {}): Loaded => ({
  interaction: SPEC,
  interactionExpiresAt: null,
  interactionClosedAt: null,
  miniAppId: APP_ID,
  miniApp: { retiredAt: null },
  responses: [],
  ...overrides,
})

const CREATED = { id: 'response-1', actionId: 'approve', values: null, respondedAt: NOW }

const createService = (
  options: {
    enabled?: boolean
    secret?: string | undefined
    previousSecret?: string
    notification?: Loaded | null
    /** Whether the user still has a registered device with the token's hash. */
    hasDevice?: boolean
  } = {}
) => {
  const loaded = options.notification === undefined ? openNotification() : options.notification
  const repository = {
    getForResponse: vi.fn(async (_userId: string, _id: string) => ok(loaded)),
    getResponse: vi.fn(async (_userId: string, _id: string) =>
      ok({ actionId: 'reject', values: { note: 'no' }, respondedAt: NOW } as {
        actionId: string
        values: unknown
        respondedAt: Date
      } | null)
    ),
    hasDeviceWithHash: vi.fn(async (_userId: string, _hash: string) =>
      ok(options.hasDevice ?? true)
    ),
    createResponse: vi.fn(
      async (_input: Record<string, unknown>) =>
        ok({ status: 'CREATED', response: CREATED }) as unknown as ReturnType<
          InteractionRepository['createResponse']
        >
    ),
    getTrayDismissTokens: vi.fn(async (_userId: string) => ok(['android-1', 'android-2'])),
    getOwnInteraction: vi.fn(async (_id: string, _appId: string) =>
      ok({ interactionClosedAt: null } as { interactionClosedAt: Date | null } | null)
    ),
    getPortalInteraction: vi.fn(async (_id: string) =>
      ok({ interactionClosedAt: null } as { interactionClosedAt: Date | null } | null)
    ),
    closeInteraction: vi.fn(async (_id: string, closedAt: Date) => ok(closedAt)),
  }
  const cloudMessaging = { sendDismiss: vi.fn(async () => ok()) }
  const dispatcher = { dispatchSoon: vi.fn() } satisfies NotificationCallbackDispatcher
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const liveActivities = {
    endForAnswer: vi.fn(async (_n: string, _u: string, _label: string) => {}),
    endForClose: vi.fn(async (_n: string) => {}),
  }

  const service = new InteractionService(
    repository as unknown as InteractionRepository,
    cloudMessaging,
    dispatcher,
    logger as unknown as ElysiaLoggerInstance,
    {
      interactiveNotificationsEnabled: options.enabled ?? true,
      responseTokenSecret: 'secret' in options ? options.secret : SECRET,
      responseTokenSecretPrevious: options.previousSecret,
    },
    () => NOW,
    liveActivities
  )
  return { service, repository, cloudMessaging, dispatcher, logger, liveActivities }
}

const session = { kind: 'session' as const, userId: USER_ID }
const tokenFor = (
  overrides: { n?: string; u?: string; exp?: number; secret?: string; device?: string } = {}
) => ({
  kind: 'token' as const,
  token: mintResponseToken(
    {
      notificationId: overrides.n ?? NOTIFICATION_ID,
      userId: overrides.u ?? USER_ID,
      exp: overrides.exp ?? Math.floor(NOW.getTime() / 1000) + 3600,
      deviceHash: deviceHash(overrides.device ?? DEVICE_TOKEN),
    },
    overrides.secret ?? SECRET
  ),
})
const codeOf = (result: { _unsafeUnwrapErr(): { code: string } }) => result._unsafeUnwrapErr().code
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('InteractionService.respond', () => {
  describe('a session answer', () => {
    test('records the answer, marks it an APP answer, and returns RESPONDED', async () => {
      const { service, repository } = createService()

      const result = await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })

      expect(repository.createResponse).toHaveBeenCalledWith({
        notificationId: NOTIFICATION_ID,
        userId: USER_ID,
        actionId: 'approve',
        values: undefined,
        channel: 'APP',
        now: NOW,
      })
      const { interaction } = result._unsafeUnwrap()
      expect(interaction.state).toBe('RESPONDED')
      expect(interaction.response?.actionId).toBe('approve')
      expect(interaction).not.toHaveProperty('ref')
    })

    test('stores the normalised values, not what was sent', async () => {
      const { service, repository } = createService()

      await service.respond(NOTIFICATION_ID, session, {
        actionId: 'approve',
        values: { note: '  โอเค  ' },
      })

      expect(repository.createResponse.mock.calls[0][0].values).toEqual({ note: 'โอเค' })
    })
  })

  describe('a tray answer', () => {
    test('a valid token records a TRAY answer as the user the token names', async () => {
      const { service, repository } = createService()

      const result = await service.respond(NOTIFICATION_ID, tokenFor({ u: 'someone' }), {
        actionId: 'approve',
      })

      expect(result.isOk()).toBe(true)
      expect(repository.getForResponse).toHaveBeenCalledWith('someone', NOTIFICATION_ID)
      expect(repository.createResponse.mock.calls[0][0]).toMatchObject({
        userId: 'someone',
        channel: 'TRAY',
      })
    })

    test('checks the device hash against the token’s own user', async () => {
      const { service, repository } = createService()

      await service.respond(NOTIFICATION_ID, tokenFor({ u: 'someone' }), { actionId: 'approve' })

      expect(repository.hasDeviceWithHash).toHaveBeenCalledWith('someone', deviceHash(DEVICE_TOKEN))
    })

    test('a token whose device is no longer the user’s is a 401 and touches nothing', async () => {
      const { service, repository } = createService({ hasDevice: false })

      const result = await service.respond(NOTIFICATION_ID, tokenFor(), { actionId: 'approve' })

      expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_RESPONSE_TOKEN_INVALID)
      expect(repository.getForResponse).not.toHaveBeenCalled()
      expect(repository.createResponse).not.toHaveBeenCalled()
    })

    test('a session answer needs no device', async () => {
      const { service, repository } = createService({ hasDevice: false })

      const result = await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })

      expect(result.isOk()).toBe(true)
      expect(repository.hasDeviceWithHash).not.toHaveBeenCalled()
    })

    test('a repository failure on the device lookup is not reported as a bad token', async () => {
      const { service, repository } = createService()
      repository.hasDeviceWithHash.mockResolvedValue(
        err({ code: 'INTERNAL_SERVER_ERROR' }) as never
      )

      const result = await service.respond(NOTIFICATION_ID, tokenFor(), { actionId: 'approve' })

      expect(codeOf(result)).not.toBe(InternalErrorCode.NOTIFICATION_RESPONSE_TOKEN_INVALID)
    })

    test('a token signed with the previous secret still verifies; unknown secrets do not', async () => {
      const rotated = createService({ previousSecret: 'old-secret' })
      const ok1 = await rotated.service.respond(
        NOTIFICATION_ID,
        tokenFor({ secret: 'old-secret' }),
        { actionId: 'approve' }
      )
      expect(ok1.isOk()).toBe(true)

      const unrotated = createService()
      const bad = await unrotated.service.respond(
        NOTIFICATION_ID,
        tokenFor({ secret: 'old-secret' }),
        { actionId: 'approve' }
      )
      expect(codeOf(bad)).toBe(InternalErrorCode.NOTIFICATION_RESPONSE_TOKEN_INVALID)
    })

    test.each([
      ['a bad signature', () => tokenFor({ secret: 'other-secret' })],
      ['an expired token', () => tokenFor({ exp: Math.floor(NOW.getTime() / 1000) - 1 })],
      ['a token for another notification', () => tokenFor({ n: 'other-notification' })],
      ['garbage', () => ({ kind: 'token' as const, token: 'not-a-token' })],
    ])('%s is a 401 and touches nothing', async (_name, credential) => {
      const { service, repository } = createService()

      const result = await service.respond(NOTIFICATION_ID, credential(), { actionId: 'approve' })

      expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_RESPONSE_TOKEN_INVALID)
      expect(repository.getForResponse).not.toHaveBeenCalled()
      expect(repository.createResponse).not.toHaveBeenCalled()
    })

    test('with no secret configured no token can be honoured', async () => {
      const { service } = createService({ secret: undefined })

      const result = await service.respond(NOTIFICATION_ID, tokenFor(), { actionId: 'approve' })

      expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_RESPONSE_TOKEN_INVALID)
    })
  })

  describe('what the caller is told about the notification', () => {
    test.each([
      ['does not exist or is not theirs', null],
      ['has no interaction', openNotification({ interaction: null })],
    ])('one that %s is the same 404', async (_name, notification) => {
      const { service, repository } = createService({ notification })

      const result = await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })

      expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_NOT_FOUND)
      expect(repository.createResponse).not.toHaveBeenCalled()
    })

    test('already answered is a 409 carrying the existing answer', async () => {
      const respondedAt = new Date('2026-11-10T03:00:00.000Z')
      const { service, repository } = createService({
        notification: openNotification({
          responses: [{ actionId: 'reject', values: { note: 'no' }, respondedAt }],
        }),
      })

      const result = await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })

      const error = result._unsafeUnwrapErr() as unknown as {
        code: string
        data: { interaction: { state: string; response: unknown } }
      }
      expect(error.code).toBe(InternalErrorCode.NOTIFICATION_ALREADY_RESPONDED)
      expect(error.data.interaction.state).toBe('RESPONDED')
      expect(error.data.interaction.response).toEqual({
        actionId: 'reject',
        values: { note: 'no' },
        respondedAt,
      })
      expect(repository.createResponse).not.toHaveBeenCalled()
    })

    test('answering wins over closed: the answerer still sees 409, not 410', async () => {
      const { service } = createService({
        notification: openNotification({
          interactionClosedAt: NOW,
          responses: [{ actionId: 'approve', values: null, respondedAt: NOW }],
        }),
      })

      const result = await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })

      expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_ALREADY_RESPONDED)
    })

    test.each([
      ['closed', { interactionClosedAt: new Date('2026-11-10T01:00:00.000Z') }],
      ['expired', { interactionExpiresAt: new Date('2026-11-10T03:59:59.000Z') }],
      ['from a retired app', { miniApp: { retiredAt: new Date('2026-11-01') } }],
      ['from a deleted app', { miniAppId: null, miniApp: null }],
    ])('one that is %s is a 410', async (_name, overrides) => {
      const { service, repository } = createService({ notification: openNotification(overrides) })

      const result = await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })

      expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_INTERACTION_CLOSED)
      expect(repository.createResponse).not.toHaveBeenCalled()
    })

    test('an answer the spec rejects is a 400 naming the field, checked even for a token', async () => {
      const { service, repository } = createService()

      const missing = await service.respond(NOTIFICATION_ID, session, { actionId: 'reject' })
      const unknown = await service.respond(NOTIFICATION_ID, tokenFor(), { actionId: 'nope' })

      for (const [result, path] of [
        [missing, 'values.note'],
        [unknown, 'actionId'],
      ] as const) {
        const error = result._unsafeUnwrapErr()
        expect(error.code).toBe(InternalErrorCode.NOTIFICATION_RESPONSE_INVALID)
        expect(error.message).toContain(path)
      }
      expect(repository.createResponse).not.toHaveBeenCalled()
    })
  })

  describe('a deleted app', () => {
    test('still shows the caller’s own answer as RESPONDED (409)', async () => {
      const { service } = createService({
        notification: openNotification({
          miniAppId: null,
          miniApp: null,
          responses: [{ actionId: 'approve', values: null, respondedAt: NOW }],
        }),
      })

      const result = await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })

      expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_ALREADY_RESPONDED)
    })
  })

  describe('an admin-portal notification', () => {
    // Sent as PPLE Today: it never had an app, so having none is not "deleted".
    const portal = () =>
      openNotification({ miniAppId: null, miniApp: null, origin: 'ADMIN_PORTAL' })

    test('is open and takes an answer although it has no app', async () => {
      const { service, repository } = createService({ notification: portal() })

      const result = await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })

      expect(result.isOk()).toBe(true)
      expect(result._unsafeUnwrap().interaction.state).toBe('RESPONDED')
      expect(repository.createResponse).toHaveBeenCalledOnce()
    })

    test('the same row without the portal origin still reads as a deleted app (410)', async () => {
      const { service } = createService({
        notification: openNotification({ miniAppId: null, miniApp: null }),
      })

      const result = await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })

      expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_INTERACTION_CLOSED)
    })
  })

  describe('closing between the read and the insert', () => {
    test.each([
      ['CLOSED', 'closed'],
      ['EXPIRED', 'expired'],
    ])('a %s verdict from the locked re-check is a 410', async (status, word) => {
      const { service, repository, dispatcher, cloudMessaging } = createService()
      repository.createResponse.mockResolvedValue(ok({ status }) as never)

      const result = await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })
      await flush()

      const error = result._unsafeUnwrapErr()
      expect(error.code).toBe(InternalErrorCode.NOTIFICATION_INTERACTION_CLOSED)
      expect(error.message).toContain(word)
      expect(dispatcher.dispatchSoon).not.toHaveBeenCalled()
      expect(cloudMessaging.sendDismiss).not.toHaveBeenCalled()
    })
  })

  describe('losing the race', () => {
    test('a unique violation becomes a 409 with the answer that won', async () => {
      const { service, repository, dispatcher } = createService()
      repository.createResponse.mockResolvedValue(
        err({ code: 'UNIQUE_CONSTRAINT_FAILED' }) as never
      )

      const result = await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })

      const error = result._unsafeUnwrapErr() as unknown as {
        code: string
        data: { interaction: { response: { actionId: string } } }
      }
      expect(error.code).toBe(InternalErrorCode.NOTIFICATION_ALREADY_RESPONDED)
      expect(error.data.interaction.response.actionId).toBe('reject')
      expect(dispatcher.dispatchSoon).not.toHaveBeenCalled()
    })
  })

  describe('after the answer is recorded', () => {
    test('starts one delivery attempt for the new row', async () => {
      const { service, dispatcher } = createService()

      await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })

      expect(dispatcher.dispatchSoon).toHaveBeenCalledExactlyOnceWith(CREATED.id)
    })

    test('a dispatcher that throws never fails the request', async () => {
      const { service, dispatcher, logger } = createService()
      dispatcher.dispatchSoon.mockImplementation(() => {
        throw new Error('boom')
      })

      const result = await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })

      expect(result.isOk()).toBe(true)
      expect(logger.error).toHaveBeenCalled()
    })

    test('dismisses the card on the user’s tray-capable Android devices', async () => {
      const { service, cloudMessaging } = createService()

      await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })
      await flush()

      expect(cloudMessaging.sendDismiss).toHaveBeenCalledWith(
        ['android-1', 'android-2'],
        NOTIFICATION_ID
      )
    })

    test('a failing dismiss is logged, never surfaced', async () => {
      const { service, cloudMessaging, logger } = createService()
      cloudMessaging.sendDismiss.mockResolvedValue(err({ code: 'x' }) as never)

      const result = await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })
      await flush()

      expect(result.isOk()).toBe(true)
      expect(logger.error).toHaveBeenCalled()
    })

    test('no dismiss is attempted when the user has no tray devices', async () => {
      const { service, repository, cloudMessaging } = createService()
      repository.getTrayDismissTokens.mockResolvedValue(ok([]))

      await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })
      await flush()

      expect(cloudMessaging.sendDismiss).not.toHaveBeenCalled()
    })

    test('a refused answer dismisses and dispatches nothing', async () => {
      const { service, cloudMessaging, dispatcher } = createService({
        notification: openNotification({ interactionClosedAt: NOW }),
      })

      await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })
      await flush()

      expect(dispatcher.dispatchSoon).not.toHaveBeenCalled()
      expect(cloudMessaging.sendDismiss).not.toHaveBeenCalled()
    })
  })

  test('is refused while the feature flag is off, with either credential', async () => {
    const { service, repository } = createService({ enabled: false })

    for (const credential of [session, tokenFor()]) {
      const result = await service.respond(NOTIFICATION_ID, credential, { actionId: 'approve' })
      expect(codeOf(result)).toBe(InternalErrorCode.INTERACTIVE_NOTIFICATIONS_DISABLED)
    }
    expect(repository.createResponse).not.toHaveBeenCalled()
  })
})

describe('InteractionService.closeInteraction', () => {
  const key = { miniApp: { id: APP_ID } }

  test('closes the app’s own notification and reports when', async () => {
    const { service, repository } = createService()

    const result = await service.closeInteraction(key, NOTIFICATION_ID)

    expect(result._unsafeUnwrap()).toEqual({ closedAt: NOW })
    expect(repository.getOwnInteraction).toHaveBeenCalledWith(NOTIFICATION_ID, APP_ID)
    expect(repository.closeInteraction).toHaveBeenCalledWith(NOTIFICATION_ID, NOW)
  })

  test('is idempotent: a second close keeps the first time and writes nothing', async () => {
    const first = new Date('2026-11-09T00:00:00.000Z')
    const { service, repository } = createService()
    repository.getOwnInteraction.mockResolvedValue(ok({ interactionClosedAt: first }))

    const result = await service.closeInteraction(key, NOTIFICATION_ID)

    expect(result._unsafeUnwrap()).toEqual({ closedAt: first })
    expect(repository.closeInteraction).not.toHaveBeenCalled()
  })

  test('another app, a missing id and no interaction are one and the same 404', async () => {
    const { service, repository } = createService()
    repository.getOwnInteraction.mockResolvedValue(ok(null))

    const result = await service.closeInteraction(key, 'someone-elses')

    expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_NOT_FOUND)
    expect(repository.closeInteraction).not.toHaveBeenCalled()
  })

  test('a key bound to no app is the same 404, without a lookup', async () => {
    const { service, repository } = createService()

    const result = await service.closeInteraction({ miniApp: null }, NOTIFICATION_ID)

    expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_NOT_FOUND)
    expect(repository.getOwnInteraction).not.toHaveBeenCalled()
  })

  test('sends no dismiss to recipients: a stale card answers 410 instead', async () => {
    const { service, cloudMessaging } = createService()

    await service.closeInteraction(key, NOTIFICATION_ID)
    await flush()

    expect(cloudMessaging.sendDismiss).not.toHaveBeenCalled()
  })

  test('is refused while the feature flag is off', async () => {
    const { service } = createService({ enabled: false })

    const result = await service.closeInteraction(key, NOTIFICATION_ID)

    expect(codeOf(result)).toBe(InternalErrorCode.INTERACTIVE_NOTIFICATIONS_DISABLED)
  })
})

describe('InteractionService.closePortalInteraction', () => {
  test('closes an admin-portal notification and ends its Live Activities', async () => {
    const { service, repository, liveActivities } = createService()

    const result = await service.closePortalInteraction(NOTIFICATION_ID)
    await flush()

    expect(result._unsafeUnwrap()).toEqual({ closedAt: NOW })
    expect(repository.getPortalInteraction).toHaveBeenCalledWith(NOTIFICATION_ID)
    expect(repository.closeInteraction).toHaveBeenCalledWith(NOTIFICATION_ID, NOW)
    expect(liveActivities.endForClose).toHaveBeenCalledWith(NOTIFICATION_ID)
  })

  test('an app’s notification, a missing id and no interaction are one 404', async () => {
    const { service, repository } = createService()
    repository.getPortalInteraction.mockResolvedValue(ok(null))

    const result = await service.closePortalInteraction('an-apps-notification')

    expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_NOT_FOUND)
    expect(repository.closeInteraction).not.toHaveBeenCalled()
  })

  test('is idempotent', async () => {
    const first = new Date('2026-11-09T00:00:00.000Z')
    const { service, repository } = createService()
    repository.getPortalInteraction.mockResolvedValue(ok({ interactionClosedAt: first }))

    const result = await service.closePortalInteraction(NOTIFICATION_ID)

    expect(result._unsafeUnwrap()).toEqual({ closedAt: first })
    expect(repository.closeInteraction).not.toHaveBeenCalled()
  })

  test('is refused while the feature flag is off', async () => {
    const { service } = createService({ enabled: false })

    const result = await service.closePortalInteraction(NOTIFICATION_ID)

    expect(codeOf(result)).toBe(InternalErrorCode.INTERACTIVE_NOTIFICATIONS_DISABLED)
  })
})

describe('Live Activity fan-out', () => {
  test('an answer ends the answering user’s activities with the action label', async () => {
    const { service, liveActivities } = createService()

    await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })
    await flush()

    expect(liveActivities.endForAnswer).toHaveBeenCalledWith(NOTIFICATION_ID, USER_ID, 'อนุมัติ')
  })

  test('a refused answer ends nothing', async () => {
    const { service, liveActivities } = createService({
      notification: openNotification({ interactionClosedAt: NOW }),
    })

    await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })
    await flush()

    expect(liveActivities.endForAnswer).not.toHaveBeenCalled()
  })

  test('a throwing ender never fails the answer', async () => {
    const { service, liveActivities, logger } = createService()
    liveActivities.endForAnswer.mockRejectedValue(new Error('boom'))

    const result = await service.respond(NOTIFICATION_ID, session, { actionId: 'approve' })
    await flush()

    expect(result.isOk()).toBe(true)
    expect(logger.error).toHaveBeenCalled()
  })

  test('close ends every activity of the notification, also on a repeat close', async () => {
    const { service, repository, liveActivities } = createService()
    const key = { miniApp: { id: APP_ID } }

    await service.closeInteraction(key, NOTIFICATION_ID)
    repository.getOwnInteraction.mockResolvedValue(ok({ interactionClosedAt: NOW }))
    await service.closeInteraction(key, NOTIFICATION_ID)
    await flush()

    expect(liveActivities.endForClose).toHaveBeenCalledTimes(2)
    expect(liveActivities.endForClose).toHaveBeenCalledWith(NOTIFICATION_ID)
  })

  test('a throwing ender never fails the close', async () => {
    const { service, liveActivities } = createService()
    liveActivities.endForClose.mockRejectedValue(new Error('boom'))

    const result = await service.closeInteraction({ miniApp: { id: APP_ID } }, NOTIFICATION_ID)
    await flush()

    expect(result.isOk()).toBe(true)
  })
})
