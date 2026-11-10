import { createHmac } from 'node:crypto'
import http from 'node:http'
import type { AddressInfo } from 'node:net'

import type { PrismaService } from '@pple-today/api-common/services'
import { MiniAppSource } from '@pple-today/database/prisma'
import { afterEach, describe, expect, test, vi } from 'vitest'

import {
  backoffDelayMs,
  buildCallbackRequest,
  buildResponseEventBody,
  CallbackHttpClient,
  classifyStatus,
  decideAfterAttempt,
  MAX_ATTEMPTS,
  nodeCallbackHttpClient,
  NotificationCallbackDeliveryService,
  NotificationCallbackSender,
  runWithConcurrency,
  signCallbackBody,
  truncateError,
} from './callback-delivery'
import { encryptCallbackSecret } from './callback-secret'

const NOW = new Date('2026-11-10T07:03:00.000Z')

describe('backoff schedule', () => {
  test('immediately, then +1m, +5m, +30m, +2h, +6h, +24h', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(backoffDelayMs)).toEqual([
      0, 60_000, 300_000, 1_800_000, 7_200_000, 21_600_000, 86_400_000,
    ])
  })
})

describe('classifyStatus', () => {
  test.each([
    [200, 'DELIVERED'],
    [204, 'DELIVERED'],
    [408, 'RETRY'],
    [429, 'RETRY'],
    [500, 'RETRY'],
    [503, 'RETRY'],
    [410, 'FAILED'],
    [400, 'FAILED'],
    [401, 'FAILED'],
    [404, 'FAILED'],
    [301, 'FAILED'],
    [302, 'FAILED'],
  ])('%i -> %s', (code, outcome) => {
    expect(classifyStatus(code)).toBe(outcome)
  })
})

describe('decideAfterAttempt', () => {
  test('2xx delivers and clears the schedule', () => {
    expect(decideAfterAttempt(1, { statusCode: 200 }, NOW)).toEqual({
      deliveryStatus: 'DELIVERED',
      attempts: 1,
      nextAttemptAt: null,
      lastStatusCode: 200,
      lastError: null,
      deliveredAt: NOW,
    })
  })

  test('a retryable status schedules the next attempt per the backoff', () => {
    const d = decideAfterAttempt(2, { statusCode: 503 }, NOW)
    expect(d.deliveryStatus).toBe('PENDING')
    expect(d.nextAttemptAt).toEqual(new Date(NOW.getTime() + 300_000))
    expect(d.lastStatusCode).toBe(503)
    expect(d.lastError).toBe('HTTP 503')
  })

  test('timeouts and network errors retry with no status code', () => {
    const d = decideAfterAttempt(1, { error: 'timeout after 10000ms' }, NOW)
    expect(d).toMatchObject({
      deliveryStatus: 'PENDING',
      lastStatusCode: null,
      lastError: 'timeout after 10000ms',
      nextAttemptAt: new Date(NOW.getTime() + 60_000),
    })
  })

  test('410 and other 4xx fail at once, without retry', () => {
    for (const code of [410, 400, 404]) {
      const d = decideAfterAttempt(1, { statusCode: code }, NOW)
      expect(d.deliveryStatus).toBe('FAILED')
      expect(d.nextAttemptAt).toBeNull()
    }
  })

  test('a redirect is a failure, never followed', () => {
    const d = decideAfterAttempt(1, { statusCode: 302 }, NOW)
    expect(d.deliveryStatus).toBe('FAILED')
    expect(d.lastError).toContain('redirects are not followed')
  })

  test('the 7th retryable failure gives up', () => {
    expect(decideAfterAttempt(MAX_ATTEMPTS - 1, { statusCode: 500 }, NOW).deliveryStatus).toBe(
      'PENDING'
    )
    const last = decideAfterAttempt(MAX_ATTEMPTS, { statusCode: 500 }, NOW)
    expect(last.deliveryStatus).toBe('FAILED')
    expect(last.nextAttemptAt).toBeNull()
    expect(last.lastError).toContain('gave up after 7 attempts')
  })

  test('lastError is truncated', () => {
    const d = decideAfterAttempt(1, { error: 'x'.repeat(5000) }, NOW)
    expect(d.lastError!.length).toBeLessThanOrEqual(300)
    expect(truncateError('short')).toBe('short')
  })
})

describe('signing and request building', () => {
  test('signature is v1=hex HMAC-SHA256(secret, "<ts>.<raw body>")', () => {
    const expected = createHmac('sha256', 'sek').update('1762758180.{"a":1}').digest('hex')
    expect(signCallbackBody('sek', 1762758180, '{"a":1}')).toBe(`v1=${expected}`)
  })

  test('ADMIN request carries the X-PPLE headers and a signature over the exact body', () => {
    const { headers, rawBody } = buildCallbackRequest({
      target: { headers: {}, signingSecret: 'sek' },
      event: 'notification.response',
      deliveryId: 'resp_1',
      body: { type: 'notification.response', attempt: 1 },
      now: NOW,
    })
    const ts = String(Math.floor(NOW.getTime() / 1000))
    expect(headers).toMatchObject({
      'Content-Type': 'application/json',
      'User-Agent': 'PPLE-Today-Callbacks/1',
      'X-PPLE-Event': 'notification.response',
      'X-PPLE-Delivery': 'resp_1',
      'X-PPLE-Timestamp': ts,
    })
    expect(headers['X-PPLE-Signature']).toBe(signCallbackBody('sek', ts, rawBody))
  })

  test('PLATFORM request has the bearer and no signature', () => {
    const { headers } = buildCallbackRequest({
      target: { headers: { Authorization: 'Bearer tok' } },
      event: 'notification.response',
      deliveryId: 'resp_1',
      body: {},
      now: NOW,
    })
    expect(headers.Authorization).toBe('Bearer tok')
    expect(headers).not.toHaveProperty('X-PPLE-Signature')
  })

  test('the response body has the spec fields: sub, ref, attempt, values', () => {
    const row = {
      id: 'resp_1',
      notificationId: 'n_1',
      userId: 'user-sub',
      actionId: 'reject',
      values: { note: 'ช่วงนั้นคนไม่พอ' },
      respondedAt: NOW,
      notification: { interaction: { v: 1, ref: 'leave:123' } },
      miniApp: { slug: 'leave-request' },
    }
    expect(buildResponseEventBody(row, 3)).toEqual({
      type: 'notification.response',
      id: 'resp_1',
      notificationId: 'n_1',
      ref: 'leave:123',
      app: { slug: 'leave-request' },
      responder: { sub: 'user-sub' },
      action: 'reject',
      values: { note: 'ช่วงนั้นคนไม่พอ' },
      respondedAt: '2026-11-10T07:03:00.000Z',
      attempt: 3,
    })
    // no ref, purged values
    const bare = buildResponseEventBody(
      { ...row, values: null, notification: { interaction: { v: 1 } } },
      1
    )
    expect(bare).not.toHaveProperty('ref')
    expect(bare.values).toEqual({})
  })
})

describe('runWithConcurrency', () => {
  test('never exceeds the limit and runs everything, even if one throws', async () => {
    let inFlight = 0
    let peak = 0
    const done: number[] = []
    await runWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      inFlight++
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight--
      if (n === 2) throw new Error('boom')
      done.push(n)
    })
    expect(peak).toBe(3)
    expect(done.sort()).toEqual([1, 3, 4, 5, 6, 7])
  })
})

describe('nodeCallbackHttpClient', () => {
  let server: http.Server | undefined
  afterEach(
    () => new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()))
  )

  const listen = async (handler: http.RequestListener) => {
    server = http.createServer(handler)
    await new Promise<void>((resolve) => server!.listen(0, '127.0.0.1', resolve))
    return (server.address() as AddressInfo).port
  }

  test('returns the status, sends the body, and ignores the response body', async () => {
    let received = ''
    const port = await listen((req, res) => {
      req.on('data', (c) => (received += c))
      req.on('end', () => res.writeHead(202).end('ignored'))
    })
    const r = await nodeCallbackHttpClient.post({
      url: `http://127.0.0.1:${port}/hook`,
      headers: { 'Content-Type': 'application/json' },
      body: '{"a":1}',
      timeoutMs: 2000,
    })
    expect(r).toEqual({ statusCode: 202 })
    expect(received).toBe('{"a":1}')
  })

  test('does not follow redirects', async () => {
    const port = await listen((_req, res) =>
      res.writeHead(302, { Location: 'http://169.254.169.254/' }).end()
    )
    const r = await nodeCallbackHttpClient.post({
      url: `http://127.0.0.1:${port}/`,
      headers: {},
      body: '{}',
      timeoutMs: 2000,
    })
    expect(r).toEqual({ statusCode: 302 })
  })

  test('times out', async () => {
    const port = await listen(() => {})
    const r = await nodeCallbackHttpClient.post({
      url: `http://127.0.0.1:${port}/`,
      headers: {},
      body: '{}',
      timeoutMs: 50,
    })
    expect(r).toEqual({ error: 'timeout after 50ms' })
  })

  test('reports a network error', async () => {
    const port = await listen(() => {})
    await new Promise<void>((resolve) => server!.close(() => resolve()))
    server = undefined
    const r = await nodeCallbackHttpClient.post({
      url: `http://127.0.0.1:${port}/`,
      headers: {},
      body: '{}',
      timeoutMs: 1000,
    })
    expect('error' in r && r.error).toContain('network error')
  })

  test('connects to the pinned address, not whatever the host resolves to', async () => {
    const port = await listen((_req, res) => res.writeHead(200).end())
    const r = await nodeCallbackHttpClient.post({
      url: `http://pinned.example.invalid:${port}/`,
      headers: {},
      body: '{}',
      timeoutMs: 2000,
      pinned: { address: '127.0.0.1', family: 4 },
    })
    expect(r).toEqual({ statusCode: 200 })
  })
})

// ---------------------------------------------------------------------------

const KEY = 'secret-key'
const publicLookup = async () => [{ address: '93.184.216.34', family: 4 as const }]

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'resp_1',
  notificationId: 'n_1',
  userId: 'user-sub',
  actionId: 'approve',
  values: null,
  respondedAt: NOW,
  attempts: 0,
  deliveryStatus: 'PENDING',
  notification: { interaction: { v: 1, ref: 'r1' } },
  miniApp: {
    slug: 'leave',
    source: MiniAppSource.ADMIN,
    notificationCallbackUrl: 'https://hooks.example.com/pple',
    notificationCallbackSecret: encryptCallbackSecret('whsec_x', KEY),
  },
  ...overrides,
})

const setup = (opts: { row?: ReturnType<typeof makeRow> | null; claimCount?: number } = {}) => {
  const row = opts.row === undefined ? makeRow() : opts.row
  const notificationResponse = {
    updateMany: vi.fn().mockResolvedValue({ count: opts.claimCount ?? 1 }),
    findUnique: vi.fn().mockResolvedValue(row),
  }
  const prismaService = {
    notificationResponse,
    $queryRaw: vi.fn().mockResolvedValue([]),
  } as unknown as PrismaService
  const post = vi.fn<CallbackHttpClient['post']>().mockResolvedValue({ statusCode: 200 })
  const sender = new NotificationCallbackSender({ secretKey: KEY }, { post }, publicLookup)
  const service = new NotificationCallbackDeliveryService(
    prismaService,
    sender,
    undefined,
    () => NOW
  )
  return { service, notificationResponse, post, prismaService }
}

describe('NotificationCallbackDeliveryService.attemptOne', () => {
  test('claims with a conditional update before sending', async () => {
    const { service, notificationResponse } = setup()
    await service.attemptOne('resp_1')
    expect(notificationResponse.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 'resp_1', deliveryStatus: 'PENDING', nextAttemptAt: { lte: NOW } },
      data: { nextAttemptAt: expect.any(Date) },
    })
    expect(
      notificationResponse.updateMany.mock.calls[0][0].data.nextAttemptAt.getTime()
    ).toBeGreaterThan(NOW.getTime())
  })

  test('does nothing when another claimer already holds the row', async () => {
    const { service, post, notificationResponse } = setup({ claimCount: 0 })
    expect(await service.attemptOne('resp_1')).toBeNull()
    expect(post).not.toHaveBeenCalled()
    expect(notificationResponse.findUnique).not.toHaveBeenCalled()
  })

  test('2xx: POSTs the signed event and marks DELIVERED', async () => {
    const { service, post, notificationResponse } = setup()
    expect(await service.attemptOne('resp_1')).toBe('DELIVERED')

    const sent = post.mock.calls[0][0]
    expect(sent.url).toBe('https://hooks.example.com/pple')
    expect(sent.pinned).toEqual({ address: '93.184.216.34', family: 4 })
    expect(sent.headers['X-PPLE-Delivery']).toBe('resp_1')
    expect(sent.headers['X-PPLE-Event']).toBe('notification.response')
    expect(sent.headers['X-PPLE-Signature']).toBe(
      signCallbackBody('whsec_x', sent.headers['X-PPLE-Timestamp'], sent.body)
    )
    expect(JSON.parse(sent.body)).toMatchObject({
      id: 'resp_1',
      responder: { sub: 'user-sub' },
      ref: 'r1',
      attempt: 1,
    })

    const update = notificationResponse.updateMany.mock.calls[1][0]
    expect(update.where).toEqual({ id: 'resp_1', deliveryStatus: 'PENDING' })
    expect(update.data).toMatchObject({
      deliveryStatus: 'DELIVERED',
      attempts: 1,
      deliveredAt: NOW,
      lastStatusCode: 200,
      lastError: null,
    })
  })

  test('5xx: stays PENDING with the next attempt scheduled and attempt number advanced', async () => {
    const { service, post, notificationResponse } = setup({ row: makeRow({ attempts: 1 }) })
    post.mockResolvedValue({ statusCode: 502 })
    expect(await service.attemptOne('resp_1')).toBe('RETRY')
    expect(JSON.parse(post.mock.calls[0][0].body).attempt).toBe(2)
    expect(notificationResponse.updateMany.mock.calls[1][0].data).toMatchObject({
      deliveryStatus: 'PENDING',
      attempts: 2,
      nextAttemptAt: new Date(NOW.getTime() + 300_000),
      lastStatusCode: 502,
    })
  })

  test('a thrown transport error is a retry, never an unhandled rejection', async () => {
    const { service, post, notificationResponse } = setup()
    post.mockRejectedValue(new Error('kaboom'))
    expect(await service.attemptOne('resp_1')).toBe('RETRY')
    expect(notificationResponse.updateMany.mock.calls[1][0].data.lastError).toContain('kaboom')
  })

  test('an unresolvable/blocked target is recorded as a retry without any POST', async () => {
    const { service, post, notificationResponse } = setup({
      row: makeRow({
        miniApp: { ...makeRow().miniApp, notificationCallbackUrl: 'https://127.0.0.1/hook' },
      }),
    })
    expect(await service.attemptOne('resp_1')).toBe('RETRY')
    expect(post).not.toHaveBeenCalled()
    expect(notificationResponse.updateMany.mock.calls[1][0].data.lastError).toContain('private')
  })

  test('a row already terminal is left alone', async () => {
    const { service, post } = setup({ row: makeRow({ deliveryStatus: 'FAILED' }) })
    expect(await service.attemptOne('resp_1')).toBeNull()
    expect(post).not.toHaveBeenCalled()
  })

  test('dispatchSoon returns immediately and swallows failures', async () => {
    const { service, prismaService } = setup()
    ;(prismaService.notificationResponse.updateMany as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('db down')
    )
    expect(service.dispatchSoon('resp_1')).toBeUndefined()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
})

describe('NotificationCallbackDeliveryService.sweep', () => {
  test('claims with FOR UPDATE SKIP LOCKED, delivers per app, then purges', async () => {
    const { service, prismaService, notificationResponse, post } = setup()
    ;(prismaService.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'resp_1', miniAppId: 'app-a' },
      { id: 'resp_2', miniAppId: 'app-b' },
    ])
    // claim lease + 2 deliveries' guarded updates + purge
    notificationResponse.updateMany.mockResolvedValue({ count: 4 })
    post.mockResolvedValueOnce({ statusCode: 200 }).mockResolvedValueOnce({ statusCode: 500 })

    const result = await service.sweep()

    const sql = (prismaService.$queryRaw as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(sql.sql ?? sql.strings.join('?')).toContain('FOR UPDATE SKIP LOCKED')
    expect(result.claimed).toBe(2)
    expect(result.delivered + result.retried).toBe(2)
    expect(result.delivered).toBe(1)
    expect(result.retried).toBe(1)
    expect(result.purged).toBe(4)
  })

  test('the purge nulls values and stamps valuesPurgedAt 90 days after delivery/failure', async () => {
    const { service, notificationResponse } = setup()
    notificationResponse.updateMany.mockResolvedValue({ count: 3 })
    expect(await service.purgeExpiredValues()).toBe(3)
    const cutoff = new Date(NOW.getTime() - 90 * 24 * 3_600_000)
    const call = notificationResponse.updateMany.mock.calls[0][0]
    expect(call.where).toEqual({
      valuesPurgedAt: null,
      OR: [
        { deliveryStatus: 'DELIVERED', deliveredAt: { lt: cutoff } },
        { deliveryStatus: 'FAILED', lastAttemptAt: { lt: cutoff } },
      ],
    })
    expect(call.data.valuesPurgedAt).toBe(NOW)
    expect(call.data.values).toBeDefined()
  })
})

describe('NotificationCallbackSender.sendTestEvent', () => {
  test('POSTs a signed notification.test event and returns the status', async () => {
    const post = vi.fn<CallbackHttpClient['post']>().mockResolvedValue({ statusCode: 204 })
    const sender = new NotificationCallbackSender({ secretKey: KEY }, { post }, publicLookup)
    const r = await sender.sendTestEvent(makeRow().miniApp, NOW)
    expect(r).toMatchObject({ ok: true, result: { statusCode: 204 } })
    const sent = post.mock.calls[0][0]
    expect(sent.headers['X-PPLE-Event']).toBe('notification.test')
    expect(JSON.parse(sent.body)).toMatchObject({
      type: 'notification.test',
      app: { slug: 'leave' },
    })
    expect(sent.headers['X-PPLE-Signature']).toMatch(/^v1=[0-9a-f]{64}$/)
  })
})
