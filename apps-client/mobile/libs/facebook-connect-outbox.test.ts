import { describe, expect, test, vi } from 'vitest'

import {
  classifySendResult,
  createOutbox,
  MAX_OUTBOX_AGE_MS,
  MAX_OUTBOX_ITEMS,
  OUTBOX_STORAGE_KEY,
  type OutboxStorage,
  withDeliveryNote,
} from './facebook-connect-outbox'
import type { ConnectTracePayload } from './facebook-connect-trace'

const T0 = Date.parse('2026-11-12T03:00:00.000Z')

const payload = (attemptId: string, steps = 2): ConnectTracePayload => ({
  attemptId,
  outcome: 'FAILED',
  startedAt: new Date(T0).toISOString(),
  failedStep: 'login',
  context: { platform: 'ios' },
  steps: Array.from({ length: steps }, (_, i) => ({
    at: i,
    name: i === steps - 1 ? 'end' : `step_${i}`,
  })),
})

const memoryStorage = () => {
  const map = new Map<string, string>()
  const storage: OutboxStorage = {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => void map.set(key, value),
  }
  return { map, storage }
}

describe('classifySendResult', () => {
  test.each([
    [{ status: 201 }, 'sent'],
    [{ networkError: true }, 'retry'],
    [{}, 'retry'],
    [{ status: 401 }, 'retry'],
    [{ status: 429 }, 'retry'],
    [{ status: 502 }, 'retry'],
    [{ status: 400 }, 'drop'],
    [{ status: 422 }, 'drop'],
  ] as const)('%j -> %s', (result, expected) => {
    expect(classifySendResult(result)).toBe(expected)
  })
})

describe('withDeliveryNote', () => {
  test('adds a delivered_late step after the end step', () => {
    const note = withDeliveryNote(
      {
        payload: payload('A'),
        firstFailedAt: T0 + 1000,
        failedSends: 2,
        lastError: 'Failed to fetch',
      },
      T0 + 60_000
    )
    expect(note.steps.at(-1)).toEqual({
      at: 60_000,
      name: 'delivered_late',
      data: {
        failedSends: 2,
        firstFailedAt: '2026-11-12T03:00:01.000Z',
        lastError: 'Failed to fetch',
      },
    })
  })

  test('stays within 50 steps and keeps the end step', () => {
    const note = withDeliveryNote(
      { payload: payload('A', 50), firstFailedAt: T0, failedSends: 1, lastError: 'x' },
      T0
    )
    expect(note.steps).toHaveLength(50)
    expect(note.steps.slice(-2).map((step) => step.name)).toEqual(['end', 'delivered_late'])
  })
})

describe('createOutbox', () => {
  test('keeps failed traces and sends them on flush', async () => {
    const { storage } = memoryStorage()
    const outbox = createOutbox(storage, () => T0)
    await outbox.add(payload('A'), 'Failed to fetch')
    await outbox.add(payload('B'), 'HTTP 502')

    const send = vi.fn().mockResolvedValue({ outcome: 'sent' })
    await expect(outbox.flush(send)).resolves.toBe(2)

    expect(send.mock.calls.map(([sent]) => sent.attemptId)).toEqual(['A', 'B'])
    expect(send.mock.calls[0][0].steps.at(-1).name).toBe('delivered_late')
    expect(await outbox.read()).toEqual([])
  })

  test('keeps what still fails, counts the failure, and drops what the API rejects', async () => {
    const { storage } = memoryStorage()
    const outbox = createOutbox(storage, () => T0)
    await outbox.add(payload('A'), 'Failed to fetch')
    await outbox.add(payload('B'), 'Failed to fetch')

    await outbox.flush(async (sent) =>
      sent.attemptId === 'A' ? { outcome: 'retry', error: 'HTTP 503' } : { outcome: 'drop' }
    )

    expect(await outbox.read()).toEqual([
      expect.objectContaining({
        payload: payload('A'),
        failedSends: 2,
        lastError: 'HTTP 503',
      }),
    ])
  })

  test('a sender that throws keeps the trace', async () => {
    const { storage } = memoryStorage()
    const outbox = createOutbox(storage, () => T0)
    await outbox.add(payload('A'), 'Failed to fetch')

    await outbox.flush(() => Promise.reject(new Error('boom')))

    expect(await outbox.read()).toHaveLength(1)
  })

  test('keeps only the newest items and forgets old ones', async () => {
    const { storage } = memoryStorage()
    let now = T0
    const outbox = createOutbox(storage, () => now)
    await outbox.add(payload('OLD'), 'x')
    now = T0 + MAX_OUTBOX_AGE_MS + 1
    for (let i = 0; i < MAX_OUTBOX_ITEMS + 5; i++) await outbox.add(payload(`N${i}`), 'x')

    const items = await outbox.read()
    expect(items).toHaveLength(MAX_OUTBOX_ITEMS)
    expect(items[0].payload.attemptId).toBe('N5')
    expect(items.some((item) => item.payload.attemptId === 'OLD')).toBe(false)
  })

  test('adding the same attempt again replaces it', async () => {
    const { storage } = memoryStorage()
    const outbox = createOutbox(storage, () => T0)
    await outbox.add(payload('A'), 'first')
    await outbox.add(payload('A'), 'second')

    expect((await outbox.read()).map((item) => item.lastError)).toEqual(['second'])
  })

  test('concurrent flushes share one run', async () => {
    const { storage } = memoryStorage()
    const outbox = createOutbox(storage, () => T0)
    await outbox.add(payload('A'), 'x')
    const send = vi.fn().mockResolvedValue({ outcome: 'sent' })

    await Promise.all([outbox.flush(send), outbox.flush(send)])

    expect(send).toHaveBeenCalledTimes(1)
  })

  test('a trace added during a flush survives it', async () => {
    const { storage } = memoryStorage()
    const outbox = createOutbox(storage, () => T0)
    await outbox.add(payload('A'), 'x')

    await outbox.flush(async () => {
      await outbox.add(payload('B'), 'added meanwhile')
      return { outcome: 'sent' }
    })

    expect((await outbox.read()).map((item) => item.payload.attemptId)).toEqual(['B'])
  })

  test('corrupt storage reads as empty and never throws', async () => {
    const { map, storage } = memoryStorage()
    map.set(OUTBOX_STORAGE_KEY, '{not json')
    const outbox = createOutbox(storage, () => T0)

    await expect(outbox.read()).resolves.toEqual([])
    await expect(
      createOutbox({
        getItem: () => Promise.reject(new Error('disk')),
        setItem: () => Promise.reject(new Error('disk')),
      }).add(payload('A'), 'x')
    ).resolves.toBeUndefined()
  })
})
