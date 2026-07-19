import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * The party operates in Thailand, so "today" means a Bangkok day — the same
 * boundary the admin dashboard counts against. Deriving the window from the
 * clock rather than storing a counter means a quota needs no reset job: the
 * usage query simply stops seeing yesterday's rows at midnight.
 */
const QUOTA_TIMEZONE = 'Asia/Bangkok'

export interface DailyQuotaInput {
  /** Sends already logged for this key inside the current window. */
  used: number
  /** Sends allowed per day, from the key's Resource Limit. */
  dailyQuota: number
  now: Date
}

export interface DailyQuotaVerdict {
  allowed: boolean
  dailyQuota: number
  used: number
  /** Sends still available in this window, including the one being judged. */
  remaining: number
  /** When the window rolls over and the budget refills. */
  resetAt: Date
}

/** The most recent Bangkok midnight — the start of the current quota window. */
export const quotaDayStart = (now: Date): Date =>
  dayjs(now).tz(QUOTA_TIMEZONE).startOf('day').toDate()

/** The next Bangkok midnight — when the current window's usage stops counting. */
const quotaDayEnd = (now: Date): Date =>
  dayjs(now).tz(QUOTA_TIMEZONE).add(1, 'day').startOf('day').toDate()

/**
 * Judge one send against a key's daily quota.
 *
 * Pure over its inputs — the caller supplies both the usage count (from the
 * usage log, since `quotaDayStart`) and the clock — so the whole rule, including
 * the day rollover, is testable without a database or a fake timer.
 *
 * `used` is the count *before* this send, so a key at 9 of 10 is still allowed
 * and reports 1 remaining. Concurrent overshoot is prevented by the repository
 * claim that locks the key before counting and writing; `remaining` still clamps
 * at zero so a historically overshot window never reports a negative budget.
 */
export const evaluateDailyQuota = ({
  used,
  dailyQuota,
  now,
}: DailyQuotaInput): DailyQuotaVerdict => ({
  allowed: used < dailyQuota,
  dailyQuota,
  used,
  remaining: Math.max(dailyQuota - used, 0),
  resetAt: quotaDayEnd(now),
})
