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
/** Most rows one sweep batch claims for a single app, so one backlog cannot starve the rest. */
export const SWEEP_PER_APP_CLAIM = 20
/** A configuration failure is retried this much later without counting an attempt. */
export const CONFIG_RETRY_DELAY_MS = 30 * 60_000
/** A row that has been undeliverable for our own reasons this long is given up on. */
export const CONFIG_FAILURE_GIVE_UP_MS = 7 * 24 * 3_600_000
export const RETENTION_MS = 90 * 24 * 3_600_000
const LAST_ERROR_MAX = 300

export type AttemptOutcome = 'DELIVERED' | 'RETRY' | 'FAILED'

/** The wait before the attempt that follows `attemptsMade` completed ones. */
export const backoffDelayMs = (attemptsMade: number): number =>
  BACKOFF_SCHEDULE_MS[Math.min(Math.max(attemptsMade, 0), BACKOFF_SCHEDULE_MS.length - 1)]

export const classifyStatus = (statusCode: number): AttemptOutcome => {
  if (statusCode >= 200 && statusCode < 300) return 'DELIVERED'
  // 401/403/404 are usually a receiver that is mid-deploy or has a wrong secret
  // or route that its owner is about to fix, so they are retried on the backoff.
  if (
    statusCode === 401 ||
    statusCode === 403 ||
    statusCode === 404 ||
    statusCode === 408 ||
    statusCode === 429 ||
    statusCode >= 500
  )
    return 'RETRY'
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

/**
 * What to store when delivery cannot even be attempted because of our own
 * configuration. The attempt is not counted; the row is tried again later and
 * only given up on after `CONFIG_FAILURE_GIVE_UP_MS` since the user answered.
 * An app that no longer exists (`reason` "app deleted") fails immediately.
 */
export const decideAfterConfigFailure = (
  reason: string,
  respondedAt: Date,
  now: Date,
  opts: { permanent?: boolean } = {}
): Omit<AttemptDecision, 'attempts'> => {
  const base = { lastStatusCode: null, deliveredAt: null }
  if (opts.permanent) {
    return {
      ...base,
      deliveryStatus: NotificationCallbackStatus.FAILED,
      nextAttemptAt: null,
      lastError: truncateError(reason),
    }
  }
  if (now.getTime() - respondedAt.getTime() > CONFIG_FAILURE_GIVE_UP_MS) {
    return {
      ...base,
      deliveryStatus: NotificationCallbackStatus.FAILED,
      nextAttemptAt: null,
      lastError: truncateError(`${reason} (gave up after 7 days)`),
    }
  }
  return {
    ...base,
    deliveryStatus: NotificationCallbackStatus.PENDING,
    nextAttemptAt: new Date(now.getTime() + CONFIG_RETRY_DELAY_MS),
    lastError: truncateError(reason),
  }
}

/** `v1=<hex HMAC-SHA256(secret, "<timestamp>.<raw body>")>` */
export const signCallbackBody = (secret: string, timestamp: number | string, rawBody: string) =>
  `v1=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`

export type CallbackRequest = { headers: Record<string, string>; rawBody: string }

export const buildCallbackRequest = (params: {
  target: Pick<CallbackTarget, 'headers' | 'signingSecrets'>
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
  if (params.target.signingSecrets?.length) {
    // `v1=<new>,v1=<old>` while a rotation grace window is open; receivers accept any match.
    headers['X-PPLE-Signature'] = params.target.signingSecrets
      .map((secret) => signCallbackBody(secret, timestamp, rawBody))
      .join(',')
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

/**
 * In-process, per-key concurrency cap (the key is a mini app id). `dispatchSoon`
 * uses `tryAcquire` and gives up when full; the sweep uses `acquire` and waits,
 * because its rows are already claimed. A released permit goes straight to the
 * oldest waiter, so a steady stream of `dispatchSoon` calls cannot starve the sweep.
 */
export class KeyedLimiter {
  private readonly state = new Map<string, { inFlight: number; waiters: (() => void)[] }>()

  constructor(private readonly limit: number) {}

  private releaser(key: string): () => void {
    let released = false
    return () => {
      if (released) return
      released = true
      const entry = this.state.get(key)
      if (!entry) return
      const next = entry.waiters.shift()
      if (next) {
        next() // hand the permit over: inFlight stays the same
        return
      }
      entry.inFlight--
      if (entry.inFlight <= 0) this.state.delete(key)
    }
  }

  /** A release function, or null when `key` is already at the cap. */
  tryAcquire(key: string): (() => void) | null {
    const entry = this.state.get(key) ?? { inFlight: 0, waiters: [] }
    if (entry.inFlight >= this.limit) return null
    entry.inFlight++
    this.state.set(key, entry)
    return this.releaser(key)
  }

  async acquire(key: string): Promise<() => void> {
    const immediate = this.tryAcquire(key)
    if (immediate) return immediate
    await new Promise<void>((resolve) => this.state.get(key)!.waiters.push(resolve))
    return this.releaser(key)
  }
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
 * original host name. The response body is never read: the socket is destroyed
 * as soon as the status line arrives.
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
          // The status is all we use. Destroy the socket instead of reading the
          // body, so a hostile receiver cannot make us drain an unbounded stream.
          res.on('error', () => {})
          done({ statusCode: res.statusCode ?? 0 })
          res.destroy()
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
  | { ok: false; reason: string; configError: boolean }

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
    const now = params.now ?? new Date()
    const resolved = await resolveCallbackTarget(params.app, this.config, this.lookup, now)
    if (!resolved.ok)
      return { ok: false, reason: resolved.reason, configError: resolved.configError }
    const { target } = resolved
    const request = buildCallbackRequest({
      target,
      event: params.event,
      deliveryId: params.deliveryId,
      body: params.body,
      now,
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
  /** Shared by `dispatchSoon` and the sweep: at most MAX_IN_FLIGHT_PER_APP per app per replica. */
  private readonly limiter = new KeyedLimiter(MAX_IN_FLIGHT_PER_APP)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly sender: NotificationCallbackSender,
    private readonly logger?: Logger,
    private readonly now: () => Date = () => new Date()
  ) {}

  /**
   * One immediate attempt, not awaited. A failure is left to the sweep. When the
   * app is already at its in-flight cap this does nothing at all: the row is not
   * claimed and stays PENDING for the sweep.
   */
  dispatchSoon(responseId: string): void {
    void this.dispatch(responseId).catch((error) => {
      this.logger?.error({ message: 'Notification callback dispatch failed', responseId, error })
    })
  }

  private async dispatch(responseId: string) {
    const row = await this.prismaService.notificationResponse.findUnique({
      where: { id: responseId },
      select: { miniAppId: true },
    })
    if (!row) return
    // A deleted app (null) needs no HTTP call, so it needs no permit.
    const release = row.miniAppId ? this.limiter.tryAcquire(row.miniAppId) : () => {}
    if (!release) return
    try {
      await this.attemptOne(responseId)
    } finally {
      release()
    }
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
            notificationCallbackPreviousSecret: true,
            notificationCallbackPreviousSecretExpiresAt: true,
          },
        },
      },
    })
    if (!row || row.deliveryStatus !== NotificationCallbackStatus.PENDING) return null

    const attemptNumber = row.attempts + 1
    // Either a counted attempt (receiver's behaviour) or a configuration failure
    // (ours: not counted, retried in 30 minutes, given up after 7 days).
    let decision: Omit<AttemptDecision, 'attempts'> & { attempts?: number }
    if (!row.miniApp) {
      decision = decideAfterConfigFailure('app deleted', row.respondedAt, this.now(), {
        permanent: true,
      })
    } else {
      let result: AttemptResult | null
      let configReason: string | null = null
      try {
        const sent = await this.sender.send({
          app: row.miniApp,
          event: 'notification.response',
          deliveryId: row.id,
          now: this.now(),
          body: buildResponseEventBody({ ...row, miniApp: row.miniApp }, attemptNumber),
        })
        if (sent.ok) result = sent.result
        else if (sent.configError) {
          result = null
          configReason = sent.reason
        } else result = { error: sent.reason }
      } catch (error) {
        result = { error: truncateError(`delivery error: ${(error as Error).message}`) }
      }
      decision =
        result === null
          ? decideAfterConfigFailure(
              configReason ?? 'configuration error',
              row.respondedAt,
              this.now()
            )
          : decideAfterAttempt(attemptNumber, result, this.now())
    }

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
   * Claim due rows, fairly, leasing them in the same statement so concurrent
   * sweeps (several replicas) and `dispatchSoon` never deliver the same row twice
   * at once.
   *
   * Postgres rejects `FOR UPDATE` in a SELECT that uses window functions, so the
   * two are in separate SELECTs. The innermost one ranks every due row per app
   * (`ROW_NUMBER() OVER (PARTITION BY "miniAppId" ORDER BY "nextAttemptAt")`) with
   * no locking; the ranks are cut to `perApp` per app and `limit` overall, oldest
   * first. The middle SELECT then locks just those candidates with
   * `FOR UPDATE SKIP LOCKED`, re-checking they are still PENDING and due, so a row
   * another replica leased in between is skipped (the batch can only come up
   * short, never double-claim). The outer UPDATE pushes `nextAttemptAt` out by the
   * lease. Only the chosen rows are ever locked, not the whole backlog.
   */
  async claimDue(
    limit = SWEEP_BATCH_SIZE,
    perApp = SWEEP_PER_APP_CLAIM
  ): Promise<{ id: string; miniAppId: string | null }[]> {
    const now = this.now()
    const leaseUntil = new Date(now.getTime() + CLAIM_LEASE_MS)
    return this.prismaService.$queryRaw<{ id: string; miniAppId: string | null }[]>(Prisma.sql`
      UPDATE "NotificationResponse"
      SET "nextAttemptAt" = ${leaseUntil}
      WHERE "id" IN (
        SELECT c."id" FROM "NotificationResponse" c
        WHERE c."id" IN (
          SELECT ranked."id" FROM (
            SELECT d."id", d."nextAttemptAt",
              ROW_NUMBER() OVER (PARTITION BY d."miniAppId" ORDER BY d."nextAttemptAt") AS rn
            FROM "NotificationResponse" d
            WHERE d."deliveryStatus" = 'PENDING' AND d."nextAttemptAt" <= ${now}
          ) ranked
          WHERE ranked.rn <= ${perApp}
          ORDER BY ranked."nextAttemptAt"
          LIMIT ${limit}
        )
        AND c."deliveryStatus" = 'PENDING' AND c."nextAttemptAt" <= ${now}
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

    // Rows are already leased; each waits for its app's permit, so an app never
    // has more than MAX_IN_FLIGHT_PER_APP in flight (counting `dispatchSoon`),
    // and a slow app does not hold up the others.
    await Promise.all(
      claimed.map(async ({ id, miniAppId }) => {
        const release = miniAppId ? await this.limiter.acquire(miniAppId) : () => {}
        try {
          const outcome = await this.deliverClaimed(id)
          if (outcome === 'DELIVERED') counts.delivered++
          else if (outcome === 'FAILED') counts.failed++
          else if (outcome === 'RETRY') counts.retried++
        } catch (error) {
          // One row must not stop the rest; it stays leased and is retried after the lease.
          this.logger?.error({ message: 'Notification callback sweep delivery failed', id, error })
        } finally {
          release()
        }
      })
    )

    const purged = await this.purgeExpiredValues()
    return { claimed: claimed.length, ...counts, purged }
  }
}
