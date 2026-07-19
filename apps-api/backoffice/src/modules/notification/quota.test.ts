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
  test('allows a send when usage is below the quota and reports what is left', () => {
    const result = evaluateDailyQuota({ used: 3, dailyQuota: 10, now: MIDDAY_BANGKOK })

    expect(result).toEqual({
      allowed: true,
      dailyQuota: 10,
      used: 3,
      // The send about to happen is not yet counted, so 7 remain including it.
      remaining: 7,
      resetAt: BANGKOK_NEXT_DAY_START,
    })
  })

  test('allows the send that exactly reaches the quota', () => {
    const result = evaluateDailyQuota({ used: 9, dailyQuota: 10, now: MIDDAY_BANGKOK })

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(1)
  })

  test('refuses the send once usage has reached the quota', () => {
    const result = evaluateDailyQuota({ used: 10, dailyQuota: 10, now: MIDDAY_BANGKOK })

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.resetAt).toEqual(BANGKOK_NEXT_DAY_START)
  })

  test('never reports a negative remaining, even if usage overshot the quota', () => {
    // Concurrent sends can each pass the check before either is logged, so
    // usage can land above the quota. Report exhausted, not a negative budget.
    const result = evaluateDailyQuota({ used: 14, dailyQuota: 10, now: MIDDAY_BANGKOK })

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  test('a zero quota refuses every send', () => {
    // The platform's way of suspending an app's notifications outright.
    const result = evaluateDailyQuota({ used: 0, dailyQuota: 0, now: MIDDAY_BANGKOK })

    expect(result.allowed).toBe(false)
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

    expect(afterReset.allowed).toBe(true)
    expect(afterReset.remaining).toBe(10)
    expect(afterReset.resetAt.getTime()).toBeGreaterThan(exhausted.resetAt.getTime())
  })
})
