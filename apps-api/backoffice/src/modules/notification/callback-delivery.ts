import { createHmac, randomUUID } from 'node:crypto'
import http from 'node:http'
import https from 'node:https'

import type { PrismaService } from '@pple-today/api-common/services'
import { NotificationCallbackStatus, Prisma } from '@pple-today/database/prisma'

import {
  CallbackTarget,
  CallbackTargetApp,
  CallbackTargetConfig,
  HostLookup,
  resolveCallbackTarget,
} from './callback-target'

/**
 * The seam between answering an interactive notification and delivering the
 * answer to the sending app.
 *
 * The answer endpoint records the NotificationResponse row, then calls
 * `dispatchSoon(responseId)` after the transaction commits and does not wait for
 * it: the user's request never depends on the app's server. The row is the outbox,
 * so a missed dispatch is picked up by the sweep.
 *
 * See docs/interactive-notifications.md, "Callback — today-v2 → app".
 */
export interface NotificationCallbackDispatcher {
  dispatchSoon(responseId: string): void
}

export class NoopNotificationCallbackDispatcher implements NotificationCallbackDispatcher {
  dispatchSoon(_responseId: string): void {}
}

// ---------------------------------------------------------------------------
// Pure: schedule, outcome classification, signing, request building
// ---------------------------------------------------------------------------

export const CALLBACK_USER_AGENT = 'PPLE-Today-Callbacks/1'
export const CALLBACK_TIMEOUT_MS = 10_000
export const MAX_ATTEMPTS = 7
/** Delay before attempt n+1 (index n) after attempt n failed: 1m, 5m, 30m, 2h, 6h, 24h. */
export const BACKOFF_SCHEDULE_MS = [
  0,
  60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 3_600_000,
  6 * 3_600_000,
  24 * 3_600_000,
] as const
/** How long a claimed row is hidden from other claimers if the claimer dies. */
export const CLAIM_LEASE_MS = 5 * 60_000
export const MAX_IN_FLIGHT_PER_APP = 10
export const SWEEP_BATCH_SIZE = 100
export const RETENTION_MS = 90 * 24 * 3_600_000
const LAST_ERROR_MAX = 300

export type AttemptOutcome = 'DELIVERED' | 'RETRY' | 'FAILED'

/** The wait before the attempt that follows `attemptsMade` completed ones. */
export const backoffDelayMs = (attemptsMade: number): number =>
  BACKOFF_SCHEDULE_MS[Math.min(Math.max(attemptsMade, 0), BACKOFF_SCHEDULE_MS.length - 1)]

export const classifyStatus = (statusCode: number): AttemptOutcome => {
  if (statusCode >= 200 && statusCode < 300) return 'DELIVERED'
  if (statusCode === 408 || statusCode === 429 || statusCode >= 500) return 'RETRY'
  // 410 Gone is how an app says "stop sending me these"; other 4xx will not fix
  // themselves; a redirect is never followed (SSRF), so it is a broken receiver.
  return 'FAILED'
}

export type AttemptResult = { statusCode: number } | { error: string }

export type AttemptDecision = {
  deliveryStatus: NotificationCallbackStatus
  attempts: number
  nextAttemptAt: Date | null
  lastStatusCode: number | null
  lastError: string | null
  deliveredAt: Date | null
}

export const truncateError = (message: string, max = LAST_ERROR_MAX) =>
  message.length > max ? `${message.slice(0, max - 1)}…` : message

/**
 * What to store after attempt number `attemptNumber` (1-based) produced `result`.
 * Never stores a response body: only the status code and our own short message.
 */
export const decideAfterAttempt = (
  attemptNumber: number,
  result: AttemptResult,
  now: Date
): AttemptDecision => {
  const statusCode = 'statusCode' in result ? result.statusCode : null
  const outcome: AttemptOutcome =
    'statusCode' in result ? classifyStatus(result.statusCode) : 'RETRY'
  const base = { attempts: attemptNumber, lastStatusCode: statusCode }

  if (outcome === 'DELIVERED') {
    return {
      ...base,
      deliveryStatus: NotificationCallbackStatus.DELIVERED,
      nextAttemptAt: null,
      lastError: null,
      deliveredAt: now,
    }
  }

  const reason =
    'error' in result
      ? result.error
      : statusCode !== null && statusCode >= 300 && statusCode < 400
        ? `HTTP ${statusCode} (redirects are not followed)`
        : `HTTP ${statusCode}`

  if (outcome === 'FAILED' || attemptNumber >= MAX_ATTEMPTS) {
    return {
      ...base,
      deliveryStatus: NotificationCallbackStatus.FAILED,
      nextAttemptAt: null,
      lastError: truncateError(
        outcome === 'FAILED' ? reason : `${reason} (gave up after ${attemptNumber} attempts)`
      ),
      deliveredAt: null,
    }
  }

  return {
    ...base,
    deliveryStatus: NotificationCallbackStatus.PENDING,
    nextAttemptAt: new Date(now.getTime() + backoffDelayMs(attemptNumber)),
    lastError: truncateError(reason),
    deliveredAt: null,
  }
}

/** `v1=<hex HMAC-SHA256(secret, "<timestamp>.<raw body>")>` */
export const signCallbackBody = (secret: string, timestamp: number | string, rawBody: string) =>
  `v1=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`

export type CallbackRequest = { headers: Record<string, string>; rawBody: string }

export const buildCallbackRequest = (params: {
  target: Pick<CallbackTarget, 'headers' | 'signingSecret'>
  event: string
  deliveryId: string
  body: unknown
  now: Date
}): CallbackRequest => {
  const rawBody = JSON.stringify(params.body)
  const timestamp = Math.floor(params.now.getTime() / 1000)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': CALLBACK_USER_AGENT,
    'X-PPLE-Event': params.event,
    'X-PPLE-Delivery': params.deliveryId,
    'X-PPLE-Timestamp': String(timestamp),
    ...params.target.headers,
  }
  if (params.target.signingSecret) {
    headers['X-PPLE-Signature'] = signCallbackBody(params.target.signingSecret, timestamp, rawBody)
  }
  return { headers, rawBody }
}

export type ResponseRowForCallback = {
  id: string
  notificationId: string
  userId: string
  actionId: string
  values: unknown
  respondedAt: Date
  notification: { interaction: unknown }
  miniApp: { slug: string }
}

export const buildResponseEventBody = (row: ResponseRowForCallback, attempt: number) => {
  const interaction = row.notification.interaction as { ref?: unknown } | null
  const ref = typeof interaction?.ref === 'string' ? interaction.ref : undefined
  return {
    type: 'notification.response',
    id: row.id,
    notificationId: row.notificationId,
    ...(ref !== undefined ? { ref } : {}),
    app: { slug: row.miniApp.slug },
    // `User.id` is the PPLE ID `sub`. Nothing else about the person.
    responder: { sub: row.userId },
    action: row.actionId,
    values: (row.values as Record<string, unknown> | null) ?? {},
    respondedAt: row.respondedAt.toISOString(),
    attempt,
  }
}

/** Run `fn` over `items` with at most `limit` in flight. Never rejects. */
export const runWithConcurrency = async <T>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> => {
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++]
      try {
        await fn(item)
      } catch {
        // the caller's fn records its own failures; one row must not stop the rest
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

// ---------------------------------------------------------------------------
// HTTP transport
// ---------------------------------------------------------------------------

export type CallbackHttpClient = {
  post(params: {
    url: string
    headers: Record<string, string>
    body: string
    timeoutMs: number
    /** Connect here instead of resolving the host again (defeats DNS rebinding). */
    pinned?: CallbackTarget['pinned']
  }): Promise<AttemptResult>
}

/**
 * POSTs with node's http(s) client, which never follows redirects (a 3xx comes
 * back as a status and is treated as a failure) and lets us pin the connection
 * to the address that passed the SSRF check while TLS still verifies the
 * original host name. The response body is drained and ignored.
 */
export const nodeCallbackHttpClient: CallbackHttpClient = {
  post: ({ url, headers, body, timeoutMs, pinned }) =>
    new Promise<AttemptResult>((resolve) => {
      let settled = false
      const done = (result: AttemptResult) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(result)
      }
      const parsed = new URL(url)
      const transport = parsed.protocol === 'http:' ? http : https
      const req = transport.request(
        url,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
          ...(pinned
            ? {
                lookup: ((
                  _host: string,
                  options: { all?: boolean },
                  cb: (...args: unknown[]) => void
                ) =>
                  options?.all
                    ? cb(null, [{ address: pinned.address, family: pinned.family }])
                    : cb(null, pinned.address, pinned.family)) as never,
              }
            : {}),
        },
        (res) => {
          res.on('error', () => {})
          res.resume()
          done({ statusCode: res.statusCode ?? 0 })
        }
      )
      const timer = setTimeout(() => {
        done({ error: `timeout after ${timeoutMs}ms` })
        req.destroy()
      }, timeoutMs)
      req.on('error', (e: NodeJS.ErrnoException) => {
        done({ error: truncateError(`network error: ${e.code ?? e.message}`) })
      })
      req.end(body)
    }),
}

// ---------------------------------------------------------------------------
// Sender (shared by delivery and the admin "send test event")
// ---------------------------------------------------------------------------

export type CallbackSendResult =
  | { ok: true; result: AttemptResult; target: CallbackTarget }
  | { ok: false; reason: string }

export class NotificationCallbackSender {
  constructor(
    private readonly config: CallbackTargetConfig,
    private readonly httpClient: CallbackHttpClient = nodeCallbackHttpClient,
    private readonly lookup?: HostLookup
  ) {}

  async send(params: {
    app: CallbackTargetApp
    event: string
    deliveryId: string
    body: unknown
    now?: Date
  }): Promise<CallbackSendResult> {
    const resolved = await resolveCallbackTarget(params.app, this.config, this.lookup)
    if (!resolved.ok) return { ok: false, reason: resolved.reason }
    const { target } = resolved
    const request = buildCallbackRequest({
      target,
      event: params.event,
      deliveryId: params.deliveryId,
      body: params.body,
      now: params.now ?? new Date(),
    })
    const result = await this.httpClient.post({
      url: target.url,
      headers: request.headers,
      body: request.rawBody,
      timeoutMs: CALLBACK_TIMEOUT_MS,
      pinned: target.pinned,
    })
    return { ok: true, result, target }
  }

  /** POST a `notification.test` event, returning the receiver's status code. */
  async sendTestEvent(app: CallbackTargetApp, now = new Date()) {
    const deliveryId = `test_${randomUUID()}`
    return this.send({
      app,
      event: 'notification.test',
      deliveryId,
      now,
      body: {
        type: 'notification.test',
        id: deliveryId,
        app: { slug: app.slug },
        sentAt: now.toISOString(),
        attempt: 1,
      },
    })
  }
}

// ---------------------------------------------------------------------------
// Delivery service (outbox claim, deliver, purge)
// ---------------------------------------------------------------------------

export type SweepResult = {
  claimed: number
  delivered: number
  retried: number
  failed: number
  purged: number
}

export type Logger = { error: (obj: unknown) => void; warn?: (obj: unknown) => void }

export class NotificationCallbackDeliveryService implements NotificationCallbackDispatcher {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly sender: NotificationCallbackSender,
    private readonly logger?: Logger,
    private readonly now: () => Date = () => new Date()
  ) {}

  /** One immediate attempt, not awaited. A failure is left to the sweep. */
  dispatchSoon(responseId: string): void {
    void this.attemptOne(responseId).catch((error) => {
      this.logger?.error({ message: 'Notification callback dispatch failed', responseId, error })
    })
  }

  /**
   * Claim a single row. The conditional update is the claim: it only matches a
   * PENDING row that is due and pushes `nextAttemptAt` out by the lease, so the
   * sweep (which claims the same way) cannot pick it up while we deliver.
   */
  async attemptOne(responseId: string): Promise<AttemptOutcome | null> {
    const now = this.now()
    const claim = await this.prismaService.notificationResponse.updateMany({
      where: {
        id: responseId,
        deliveryStatus: NotificationCallbackStatus.PENDING,
        nextAttemptAt: { lte: now },
      },
      data: { nextAttemptAt: new Date(now.getTime() + CLAIM_LEASE_MS) },
    })
    if (claim.count !== 1) return null
    return this.deliverClaimed(responseId)
  }

  /** Deliver a row this process has already claimed. */
  async deliverClaimed(responseId: string): Promise<AttemptOutcome | null> {
    const row = await this.prismaService.notificationResponse.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        notificationId: true,
        userId: true,
        actionId: true,
        values: true,
        respondedAt: true,
        attempts: true,
        deliveryStatus: true,
        notification: { select: { interaction: true } },
        miniApp: {
          select: {
            slug: true,
            source: true,
            notificationCallbackUrl: true,
            notificationCallbackSecret: true,
          },
        },
      },
    })
    if (!row || row.deliveryStatus !== NotificationCallbackStatus.PENDING) return null

    const attemptNumber = row.attempts + 1
    let result: AttemptResult
    try {
      const sent = await this.sender.send({
        app: row.miniApp,
        event: 'notification.response',
        deliveryId: row.id,
        body: buildResponseEventBody(row, attemptNumber),
      })
      result = sent.ok ? sent.result : { error: sent.reason }
    } catch (error) {
      result = { error: truncateError(`delivery error: ${(error as Error).message}`) }
    }

    const decision = decideAfterAttempt(attemptNumber, result, this.now())
    // Guarded on PENDING so a row retired mid-flight stays FAILED ("app retired").
    await this.prismaService.notificationResponse.updateMany({
      where: { id: row.id, deliveryStatus: NotificationCallbackStatus.PENDING },
      data: { ...decision, lastAttemptAt: this.now() },
    })
    return decision.deliveryStatus === NotificationCallbackStatus.DELIVERED
      ? 'DELIVERED'
      : decision.deliveryStatus === NotificationCallbackStatus.FAILED
        ? 'FAILED'
        : 'RETRY'
  }

  /**
   * Claim due rows with `FOR UPDATE SKIP LOCKED`, leasing them in the same
   * statement so concurrent sweeps (several replicas) and `dispatchSoon` never
   * deliver the same row twice at once.
   */
  async claimDue(limit = SWEEP_BATCH_SIZE): Promise<{ id: string; miniAppId: string }[]> {
    const now = this.now()
    const leaseUntil = new Date(now.getTime() + CLAIM_LEASE_MS)
    return this.prismaService.$queryRaw<{ id: string; miniAppId: string }[]>(Prisma.sql`
      UPDATE "NotificationResponse"
      SET "nextAttemptAt" = ${leaseUntil}
      WHERE "id" IN (
        SELECT "id" FROM "NotificationResponse"
        WHERE "deliveryStatus" = 'PENDING' AND "nextAttemptAt" <= ${now}
        ORDER BY "nextAttemptAt"
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "miniAppId"
    `)
  }

  /** The 90-day retention purge: values -> null, `valuesPurgedAt` stamped. */
  async purgeExpiredValues(): Promise<number> {
    const now = this.now()
    const cutoff = new Date(now.getTime() - RETENTION_MS)
    const result = await this.prismaService.notificationResponse.updateMany({
      where: {
        valuesPurgedAt: null,
        OR: [
          {
            deliveryStatus: NotificationCallbackStatus.DELIVERED,
            deliveredAt: { lt: cutoff },
          },
          {
            deliveryStatus: NotificationCallbackStatus.FAILED,
            lastAttemptAt: { lt: cutoff },
          },
        ],
      },
      data: { values: Prisma.DbNull, valuesPurgedAt: now },
    })
    return result.count
  }

  async sweep(): Promise<SweepResult> {
    const claimed = await this.claimDue()
    const counts = { delivered: 0, retried: 0, failed: 0 }

    const byApp = new Map<string, string[]>()
    for (const { id, miniAppId } of claimed) {
      byApp.set(miniAppId, [...(byApp.get(miniAppId) ?? []), id])
    }
    // Apps run in parallel; within an app at most MAX_IN_FLIGHT_PER_APP at once,
    // so one slow app cannot hold up the others.
    await Promise.all(
      Array.from(byApp.values()).map((ids) =>
        runWithConcurrency(ids, MAX_IN_FLIGHT_PER_APP, async (id) => {
          const outcome = await this.deliverClaimed(id)
          if (outcome === 'DELIVERED') counts.delivered++
          else if (outcome === 'FAILED') counts.failed++
          else if (outcome === 'RETRY') counts.retried++
        })
      )
    )

    const purged = await this.purgeExpiredValues()
    return { claimed: claimed.length, ...counts, purged }
  }
}
