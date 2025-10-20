/**
 * Automatically Relative Time
 * https://stackoverflow.com/a/67374710
 */

const SEC_IN_MILLIS = 1e3
const MIN_IN_MILLIS = 6e4
const HOUR_IN_MILLIS = 3.6e6
const DAY_IN_MILLIS = 8.64e7
const WEEK_IN_MILLIS = 6.048e8
const MONTH_IN_MILLIS = 1.8144e10
const YEAR_IN_MILLIS = 3.1536e10

export const DEFAULT_RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('th', {
  numeric: 'always',
})

export const getRelativeTime = (
  time: Date,
  formatter: Intl.RelativeTimeFormat = DEFAULT_RELATIVE_TIME_FORMATTER
) => {
  const diff = time.getTime() - Date.now()
  if (Math.abs(diff) > YEAR_IN_MILLIS)
    return formatter.format(Math.trunc(diff / YEAR_IN_MILLIS), 'year')
  if (Math.abs(diff) > MONTH_IN_MILLIS)
    return formatter.format(Math.trunc(diff / MONTH_IN_MILLIS), 'month')
  if (Math.abs(diff) > WEEK_IN_MILLIS)
    return formatter.format(Math.trunc(diff / WEEK_IN_MILLIS), 'week')
  if (Math.abs(diff) > DAY_IN_MILLIS)
    return formatter.format(Math.trunc(diff / DAY_IN_MILLIS), 'day')
  if (Math.abs(diff) > HOUR_IN_MILLIS)
    return formatter.format(Math.trunc((diff % DAY_IN_MILLIS) / HOUR_IN_MILLIS), 'hour')
  if (Math.abs(diff) > MIN_IN_MILLIS)
    return formatter.format(Math.trunc((diff % HOUR_IN_MILLIS) / MIN_IN_MILLIS), 'minute')
  return formatter.format(Math.trunc((diff % MIN_IN_MILLIS) / SEC_IN_MILLIS), 'second')
}
