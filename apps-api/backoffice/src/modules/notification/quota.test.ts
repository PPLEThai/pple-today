import { describe, expect, test } from 'vitest'

import { evaluateDailyQuota, quotaDayStart } from './quota'

// 2026-07-19T04:30:00Z is 11:30 on the 19th in Bangkok (UTC+7).
const MIDDAY_BANGKOK = new Date('2026-07-19T04:30:00.000Z')
const BANGKOK_DAY_START = new Date('2026-07-18T17:00:00.000Z') // 19th 00:00 +07
const BANGKOK_NEXT_DAY_START = new Date('2026-07-19T17:00:00.000Z') // 20th 00:00 +07

describe('quotaDayStart', () => {
  test('is the most recent midnight in Bangkok, not in UTC', () => {
    expect(quotaDayStart(MIDDAY_BANGKOK)).toEqual(BANGKOK_DAY_START)
  })

  test('an evening UTC instant already belongs to the next Bangkok day', () => {
    // 2026-07-19T18:00:00Z is 01:00 on the 20th in Bangkok — the quota has
    // already reset, even though it is still the 19th in UTC.
    expect(quotaDayStart(new Date('2026-07-19T18:00:00.000Z'))).toEqual(BANGKOK_NEXT_DAY_START)
  })

  test('is stable across a single Bangkok day', () => {
    const justAfterMidnight = quotaDayStart(new Date('2026-07-18T17:00:01.000Z'))
    const justBeforeMidnight = quotaDayStart(new Date('2026-07-19T16:59:59.000Z'))

    expect(justAfterMidnight).toEqual(BANGKOK_DAY_START)
    expect(justBeforeMidnight).toEqual(BANGKOK_DAY_START)
  })
})

describe('evaluateDailyQuota', () => {
  test('reports the budget, what is spent, and what is left', () => {
    const result = evaluateDailyQuota({ used: 3, dailyQuota: 10, now: MIDDAY_BANGKOK })

    expect(result).toEqual({
      dailyQuota: 10,
      used: 3,
      remaining: 7,
      resetAt: BANGKOK_NEXT_DAY_START,
    })
  })

  test('reads the same whichever moment the caller is describing', () => {
    // A refusal passes the count *before* the call; a success passes the count
    // *including* it. Both want "what is left given this much spent", which is
    // why one function serves both rather than two that differ by an offset.
    const beforeARefusedCall = evaluateDailyQuota({ used: 9, dailyQuota: 10, now: MIDDAY_BANGKOK })
    const afterOneThatLanded = evaluateDailyQuota({ used: 10, dailyQuota: 10, now: MIDDAY_BANGKOK })

    expect(beforeARefusedCall.remaining).toBe(1)
    expect(afterOneThatLanded.remaining).toBe(0)
  })

  test('an exhausted budget reports zero left and when it refills', () => {
    const result = evaluateDailyQuota({ used: 10, dailyQuota: 10, now: MIDDAY_BANGKOK })

    expect(result.remaining).toBe(0)
    expect(result.resetAt).toEqual(BANGKOK_NEXT_DAY_START)
  })

  test('never reports a negative remaining, even if usage overshot the quota', () => {
    // Concurrent claims against an older, un-locked path could land usage above
    // the quota. Report exhausted, not a negative budget.
    const result = evaluateDailyQuota({ used: 14, dailyQuota: 10, now: MIDDAY_BANGKOK })

    expect(result.remaining).toBe(0)
  })

  test('a zero quota has nothing to spend', () => {
    // The platform's way of suspending an app's notifications outright.
    const result = evaluateDailyQuota({ used: 0, dailyQuota: 0, now: MIDDAY_BANGKOK })

    expect(result.remaining).toBe(0)
  })

  test('the reset instant is the next Bangkok midnight, so the budget resets daily', () => {
    const exhausted = evaluateDailyQuota({ used: 10, dailyQuota: 10, now: MIDDAY_BANGKOK })

    // Same key, same quota, one second into the next Bangkok day: the usage
    // window has moved on, so the count restarts from zero and sends resume.
    const afterReset = evaluateDailyQuota({
      used: 0,
      dailyQuota: 10,
      now: new Date(exhausted.resetAt.getTime() + 1000),
    })

    expect(afterReset.remaining).toBe(10)
    expect(afterReset.resetAt.getTime()).toBeGreaterThan(exhausted.resetAt.getTime())
  })
})
