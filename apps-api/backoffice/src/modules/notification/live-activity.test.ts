import { InternalErrorCode } from '@pple-today/api-common/dtos'
import type { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { ok } from 'neverthrow'
import { describe, expect, test, vi } from 'vitest'

import { LIVE_ACTIVITY_SWEEP_LIMIT, LiveActivityService } from './live-activity'
import { deviceHash, mintResponseToken } from './response-token'

const NOW = new Date('2026-11-10T04:00:00.000Z')
const SECRET = 'test-secret'
const NOTIFICATION_ID = 'notification-1'
const USER_ID = 'user-1'
const DEVICE_TOKEN = 'fcm-device-1'

const SPEC = {
  v: 1 as const,
  fields: [],
  actions: [
    { id: 'approve', label: 'อนุมัติ', style: 'primary' as const },
    { id: 'reject', label: 'ไม่อนุมัติ', style: 'destructive' as const },
  ],
  tray: true,
  liveActivity: true,
}

type Loaded = {
  interaction: unknown
  interactionExpiresAt: Date | null
  interactionClosedAt: Date | null
  miniAppId: string | null
  miniApp: { retiredAt: Date | null } | null
  responses: { actionId: string; values: unknown; respondedAt: Date }[]
}
const openNotification = (overrides: Partial<Loaded> = {}): Loaded => ({
  interaction: SPEC,
  interactionExpiresAt: new Date(NOW.getTime() + 3600_000),
  interactionClosedAt: null,
  miniAppId: 'app-1',
  miniApp: { retiredAt: null },
  responses: [],
  ...overrides,
})

const createService = (
  options: {
    notification?: Loaded | null
    deviceToken?: string | null
    disabled?: boolean
    sendOk?: boolean
    unended?: { id: string; deviceToken: string; pushToken: string }[]
    expired?: {
      id: string
      deviceToken: string
      pushToken: string
      notification: { interactionClosedAt: Date | null }
    }[]
  } = {}
) => {
  const loaded = options.notification === undefined ? openNotification() : options.notification
  const liveRepo = {
    getDeviceTokenByHash: vi.fn(async (_u: string, _h: string) =>
      ok(options.deviceToken === undefined ? DEVICE_TOKEN : options.deviceToken)
    ),
    upsert: vi.fn(async (_input: Record<string, unknown>) => ok({ id: 'la-1', endedAt: null })),
    listUnended: vi.fn(async (_input: Record<string, unknown>) => ok(options.unended ?? [])),
    listExpiredUnended: vi.fn(async (_now: Date, _limit: number) => ok(options.expired ?? [])),
    markEnded: vi.fn(async (_ids: string[], _now: Date) => ok({ count: 0 })),
  }
  const interactionRepo = {
    getForResponse: vi.fn(async (_u: string, _n: string) => ok(loaded)),
  }
  const sender = {
    sendLiveActivityEnds: vi.fn(async (ends: unknown[]) =>
      ends.map(() =>
        options.sendOk === false ? { ok: false, error: 'fcm said no' } : { ok: true }
      )
    ),
  }
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const service = new LiveActivityService(
    liveRepo as never,
    interactionRepo as never,
    sender,
    logger as unknown as ElysiaLoggerInstance,
    {
      interactiveNotificationsEnabled: true,
      liveActivityDisabled: options.disabled,
      responseTokenSecret: SECRET,
    },
    () => NOW
  )
  return { service, liveRepo, interactionRepo, sender, logger }
}

const token = (overrides: { n?: string; secret?: string; exp?: number } = {}) =>
  mintResponseToken(
    {
      notificationId: overrides.n ?? NOTIFICATION_ID,
      userId: USER_ID,
      exp: overrides.exp ?? Math.floor(NOW.getTime() / 1000) + 3600,
      deviceHash: deviceHash(DEVICE_TOKEN),
    },
    overrides.secret ?? SECRET
  )
const codeOf = (r: { _unsafeUnwrapErr(): { code: string } }) => r._unsafeUnwrapErr().code

describe('LiveActivityService.registerPushToken', () => {
  test('a valid token upserts the row for (notification, device) and answers OPEN', async () => {
    const { service, liveRepo } = createService()

    const result = await service.registerPushToken(NOTIFICATION_ID, token(), 'aabb')

    expect(result._unsafeUnwrap()).toEqual({ state: 'OPEN' })
    expect(liveRepo.getDeviceTokenByHash).toHaveBeenCalledWith(USER_ID, deviceHash(DEVICE_TOKEN))
    expect(liveRepo.upsert).toHaveBeenCalledWith({
      notificationId: NOTIFICATION_ID,
      userId: USER_ID,
      deviceToken: DEVICE_TOKEN,
      pushToken: 'aabb',
      ended: false,
      now: NOW,
    })
  })

  test.each([
    ['no token', undefined],
    ['garbage', 'v1.a.b'],
    ['wrong secret', token({ secret: 'other' })],
    ['expired', token({ exp: Math.floor(NOW.getTime() / 1000) - 1 })],
    ['another notification', token({ n: 'someone-elses' })],
  ])('%s is a 401 and stores nothing', async (_name, bad) => {
    const { service, liveRepo } = createService()

    const result = await service.registerPushToken(NOTIFICATION_ID, bad, 'aabb')

    expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_RESPONSE_TOKEN_INVALID)
    expect(liveRepo.upsert).not.toHaveBeenCalled()
  })

  test('a device no longer registered to the user is a 401', async () => {
    const { service, liveRepo } = createService({ deviceToken: null })

    const result = await service.registerPushToken(NOTIFICATION_ID, token(), 'aabb')

    expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_RESPONSE_TOKEN_INVALID)
    expect(liveRepo.upsert).not.toHaveBeenCalled()
  })

  test('a notification the caller cannot see is a 404', async () => {
    const { service, liveRepo } = createService({ notification: null })

    const result = await service.registerPushToken(NOTIFICATION_ID, token(), 'aabb')

    expect(codeOf(result)).toBe(InternalErrorCode.NOTIFICATION_NOT_FOUND)
    expect(liveRepo.upsert).not.toHaveBeenCalled()
  })

  test('RESPONDED stores the row ended and returns the action label', async () => {
    const { service, liveRepo } = createService({
      notification: openNotification({
        responses: [{ actionId: 'reject', values: null, respondedAt: NOW }],
      }),
    })

    const result = await service.registerPushToken(NOTIFICATION_ID, token(), 'aabb')

    expect(result._unsafeUnwrap()).toEqual({ state: 'RESPONDED', actionLabel: 'ไม่อนุมัติ' })
    expect(liveRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({ ended: true }))
  })

  test.each([
    ['CLOSED', { interactionClosedAt: NOW }],
    ['EXPIRED', { interactionExpiresAt: new Date(NOW.getTime() - 1) }],
  ])('%s stores the row ended, with no label', async (state, overrides) => {
    const { service, liveRepo } = createService({ notification: openNotification(overrides) })

    const result = await service.registerPushToken(NOTIFICATION_ID, token(), 'aabb')

    expect(result._unsafeUnwrap()).toEqual({ state })
    expect(liveRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({ ended: true }))
  })
})

describe('LiveActivityService end fan-out', () => {
  const rows = [
    { id: 'la-1', deviceToken: 'fcm-a', pushToken: 'aa' },
    { id: 'la-2', deviceToken: 'fcm-b', pushToken: 'bb' },
  ]

  test('an answer ends only that user’s un-ended activities with the answered state', async () => {
    const { service, liveRepo, sender } = createService({ unended: rows })

    await service.endForAnswer(NOTIFICATION_ID, USER_ID, 'อนุมัติ')

    expect(liveRepo.listUnended).toHaveBeenCalledWith({
      notificationId: NOTIFICATION_ID,
      userId: USER_ID,
    })
    expect(sender.sendLiveActivityEnds).toHaveBeenCalledWith([
      { deviceToken: 'fcm-a', pushToken: 'aa', state: { status: 'answered', label: 'อนุมัติ' } },
      { deviceToken: 'fcm-b', pushToken: 'bb', state: { status: 'answered', label: 'อนุมัติ' } },
    ])
    expect(liveRepo.markEnded).toHaveBeenCalledWith(['la-1', 'la-2'], NOW)
  })

  test('close ends every un-ended activity of the notification', async () => {
    const { service, liveRepo, sender } = createService({ unended: rows })

    await service.endForClose(NOTIFICATION_ID)

    expect(liveRepo.listUnended).toHaveBeenCalledWith({ notificationId: NOTIFICATION_ID })
    expect(sender.sendLiveActivityEnds).toHaveBeenCalledWith(
      rows.map((r) => ({
        deviceToken: r.deviceToken,
        pushToken: r.pushToken,
        state: { status: 'closed' },
      }))
    )
    expect(liveRepo.markEnded).toHaveBeenCalledWith(['la-1', 'la-2'], NOW)
  })

  test('nothing to end sends nothing', async () => {
    const { service, sender, liveRepo } = createService({ unended: [] })

    await service.endForClose(NOTIFICATION_ID)

    expect(sender.sendLiveActivityEnds).not.toHaveBeenCalled()
    expect(liveRepo.markEnded).not.toHaveBeenCalled()
  })

  test('rows are marked ended even when FCM fails, and the failure is logged', async () => {
    const { service, liveRepo, logger } = createService({ unended: rows, sendOk: false })

    await service.endForClose(NOTIFICATION_ID)

    expect(liveRepo.markEnded).toHaveBeenCalledWith(['la-1', 'la-2'], NOW)
    expect(logger.error).toHaveBeenCalledTimes(2)
  })

  test('never throws, even if the sender or repository does', async () => {
    const { service, sender, liveRepo } = createService({ unended: rows })
    sender.sendLiveActivityEnds.mockRejectedValue(new Error('boom'))
    await expect(service.endForClose(NOTIFICATION_ID)).resolves.toBeUndefined()
    liveRepo.listUnended.mockRejectedValue(new Error('db down'))
    await expect(service.endForAnswer(NOTIFICATION_ID, USER_ID, 'x')).resolves.toBeUndefined()
    await expect(service.sweepExpired()).resolves.toBeTypeOf('number')
  })

  test('with LIVE_ACTIVITY_DISABLED nothing is sent and rows stay un-ended', async () => {
    const { service, sender, liveRepo } = createService({
      unended: rows,
      disabled: true,
      expired: [{ ...rows[0], notification: { interactionClosedAt: null } }],
    })

    await service.endForClose(NOTIFICATION_ID)
    await service.endForAnswer(NOTIFICATION_ID, USER_ID, 'x')
    const swept = await service.sweepExpired()

    expect(swept).toBe(0)
    expect(sender.sendLiveActivityEnds).not.toHaveBeenCalled()
    expect(liveRepo.markEnded).not.toHaveBeenCalled()
  })
})

describe('LiveActivityService.sweepExpired', () => {
  test('ends expired activities as expired (closed when it was closed), bounded', async () => {
    const { service, liveRepo, sender } = createService({
      expired: [
        {
          id: 'la-1',
          deviceToken: 'fcm-a',
          pushToken: 'aa',
          notification: { interactionClosedAt: null },
        },
        {
          id: 'la-2',
          deviceToken: 'fcm-b',
          pushToken: 'bb',
          notification: { interactionClosedAt: NOW },
        },
      ],
    })

    const ended = await service.sweepExpired()

    expect(ended).toBe(2)
    expect(liveRepo.listExpiredUnended).toHaveBeenCalledWith(NOW, LIVE_ACTIVITY_SWEEP_LIMIT)
    expect(LIVE_ACTIVITY_SWEEP_LIMIT).toBe(200)
    expect(sender.sendLiveActivityEnds).toHaveBeenCalledWith([
      { deviceToken: 'fcm-a', pushToken: 'aa', state: { status: 'expired' } },
      { deviceToken: 'fcm-b', pushToken: 'bb', state: { status: 'closed' } },
    ])
    expect(liveRepo.markEnded).toHaveBeenCalledWith(['la-1', 'la-2'], NOW)
  })

  test('nothing expired ends nothing', async () => {
    const { service, sender } = createService()

    expect(await service.sweepExpired()).toBe(0)
    expect(sender.sendLiveActivityEnds).not.toHaveBeenCalled()
  })
})
