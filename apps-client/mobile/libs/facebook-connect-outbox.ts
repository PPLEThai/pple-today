import type { ConnectTracePayload } from './facebook-connect-trace'

/**
 * Connect-attempt traces that could not be sent yet.
 *
 * Sending is fire-and-forget, but some users connect from networks that block
 * the API (Parliament's wifi does), which is exactly when we need the trace.
 * A trace whose send fails for a reason that can pass is kept on the device
 * and sent again on the next app launch or foreground, or with the next
 * attempt. The backend accepts a resend of the same attempt id, so a send that
 * actually landed but looked failed is harmless.
 *
 * Pure apart from the injected storage and sender, so it is unit-tested.
 */

export const OUTBOX_STORAGE_KEY = 'facebook-connect-attempt-outbox'
export const MAX_OUTBOX_ITEMS = 20
export const MAX_OUTBOX_AGE_MS = 30 * 24 * 60 * 60 * 1000
/** The backend's limit on steps per trace. */
const MAX_STEPS = 50

export interface OutboxStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

export interface OutboxItem {
  payload: ConnectTracePayload
  firstFailedAt: number
  failedSends: number
  lastError: string
}

/**
 * What a send attempt came to. `retry` keeps the trace: the network or the
 * server failed, or the session expired (401) and the user may sign in again.
 * `drop` is for a trace the backend will never accept (any other 4xx).
 */
export type SendOutcome = 'sent' | 'retry' | 'drop'

export function classifySendResult(result: {
  status?: number
  networkError?: boolean
}): SendOutcome {
  if (result.networkError || result.status === undefined) return 'retry'
  if (result.status < 300) return 'sent'
  if (result.status === 401 || result.status === 408 || result.status === 429) return 'retry'
  if (result.status >= 500) return 'retry'
  return 'drop'
}

/**
 * Note on the trace that it was delivered late, so support can see the user's
 * network failed. Kept within the backend's step limit by dropping the step
 * before the last (the last one is the attempt's `end`).
 */
export function withDeliveryNote(item: OutboxItem, now: number): ConnectTracePayload {
  const startedAt = Date.parse(item.payload.startedAt)
  const steps = [
    ...item.payload.steps,
    {
      at: Math.max(0, Math.round(now - (Number.isNaN(startedAt) ? now : startedAt))),
      name: 'delivered_late',
      data: {
        failedSends: item.failedSends,
        firstFailedAt: new Date(item.firstFailedAt).toISOString(),
        lastError: item.lastError,
      },
    },
  ]
  while (steps.length > MAX_STEPS) steps.splice(steps.length - 3, 1)
  return { ...item.payload, steps }
}

export function createOutbox(storage: OutboxStorage, now: () => number = Date.now) {
  let flushing: Promise<number> | null = null

  async function read(): Promise<OutboxItem[]> {
    try {
      const raw = await storage.getItem(OUTBOX_STORAGE_KEY)
      const parsed: unknown = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? (parsed as OutboxItem[]) : []
    } catch {
      return []
    }
  }

  async function write(items: OutboxItem[]) {
    try {
      await storage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(items))
    } catch {
      // Diagnostics only: losing the outbox must never affect the app
    }
  }

  function prune(items: OutboxItem[]) {
    const cutoff = now() - MAX_OUTBOX_AGE_MS
    return items.filter((item) => item.firstFailedAt >= cutoff).slice(-MAX_OUTBOX_ITEMS)
  }

  return {
    /** Keep a trace whose send failed. Newest wins when the outbox is full. */
    async add(payload: ConnectTracePayload, error: string) {
      const items = (await read()).filter((item) => item.payload.attemptId !== payload.attemptId)
      items.push({ payload, firstFailedAt: now(), failedSends: 1, lastError: error.slice(0, 200) })
      await write(prune(items))
    },

    /**
     * Send every kept trace once. Returns how many were delivered. Concurrent
     * calls share one flush.
     */
    flush(
      send: (payload: ConnectTracePayload) => Promise<{ outcome: SendOutcome; error?: string }>
    ) {
      flushing ??= (async () => {
        try {
          const items = prune(await read())
          if (items.length === 0) return 0
          const remaining: OutboxItem[] = []
          let delivered = 0
          for (const item of items) {
            const { outcome, error } = await send(withDeliveryNote(item, now())).catch(
              (sendError: unknown) => ({ outcome: 'retry' as const, error: String(sendError) })
            )
            if (outcome === 'sent') delivered++
            if (outcome === 'retry') {
              remaining.push({
                ...item,
                failedSends: item.failedSends + 1,
                lastError: (error ?? item.lastError).slice(0, 200),
              })
            }
          }
          // Traces added while flushing are in storage, not in `items`
          const added = (await read()).filter(
            (item) => !items.some((sent) => sent.payload.attemptId === item.payload.attemptId)
          )
          await write(prune([...remaining, ...added]))
          return delivered
        } finally {
          flushing = null
        }
      })()
      return flushing
    },

    read,
  }
}
