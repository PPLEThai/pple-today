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
  /**
   * Deliveries logged for this key inside the current window — the `units` sum,
   * as of the moment being described. The caller decides which moment that is:
   * the count *before* a refused call, or the count *including* one that landed.
   */
  used: number
  /** Deliveries allowed per day, from the key's Resource Limit. */
  dailyQuota: number
  now: Date
}

export interface DailyQuotaVerdict {
  dailyQuota: number
  used: number
  /** Deliveries still available in this window, given `used`. */
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
 * Describe a key's daily budget: what it is, what has been spent, what is left,
 * and when it refills.
 *
 * Pure over its inputs — the caller supplies both the usage count (from the
 * usage log, since `quotaDayStart`) and the clock — so the whole rule, including
 * the day rollover, is testable without a database or a fake timer.
 *
 * It *describes* rather than *decides*. Whether a call fits is settled inside
 * `AppNotificationRepository.claimUsage`, under the row lock that makes the
 * answer race-free — a verdict reached out here could not be, since two callers
 * could both read the same `used`. So both of the service's paths report through
 * this one function: the refusal passes the count before the call, the success
 * passes the count including it, and `remaining` is what is left either way.
 *
 * `remaining` clamps at zero, so a window that historically overshot (concurrent
 * claims against an older, un-locked path) never reports a negative budget.
 */
export const evaluateDailyQuota = ({
  used,
  dailyQuota,
  now,
}: DailyQuotaInput): DailyQuotaVerdict => ({
  dailyQuota,
  used,
  remaining: Math.max(dailyQuota - used, 0),
  resetAt: quotaDayEnd(now),
})
