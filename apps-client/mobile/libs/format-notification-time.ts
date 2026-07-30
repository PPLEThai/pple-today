import 'dayjs/locale/th'

import dayjs from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'

dayjs.extend(buddhistEra)

/** Past this age a notification is dated rather than counted. */
const COUNTED_WITHIN_DAYS = 7

/**
 * How a notification's age reads in the notification centre.
 *
 * A recent notification is counted ("5 นาทีที่แล้ว") because that is how someone
 * reasons about something they may not have seen yet — "is this the one that
 * just buzzed?" — while a calendar date makes them do the subtraction. Past a
 * week the count stops carrying that meaning and the date is the more useful
 * fact, so the two formats swap.
 *
 * `now` is a parameter rather than a call to the clock so the boundaries can be
 * tested; every caller omits it.
 */
export function formatNotificationTime(
  date: dayjs.ConfigType,
  now: dayjs.ConfigType = undefined
): string {
  const then = dayjs(date)
  // A device clock running behind the server's would otherwise count forward,
  // which reads as a notification from the future. Treat it as just now.
  const seconds = Math.max(0, dayjs(now).diff(then, 'second'))

  if (seconds < 60) {
    return 'เมื่อสักครู่'
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} นาทีที่แล้ว`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} ชั่วโมงที่แล้ว`
  }

  const days = Math.floor(hours / 24)
  if (days < COUNTED_WITHIN_DAYS) {
    return `${days} วันที่แล้ว`
  }

  // Named explicitly rather than left to the global locale: this returns Thai
  // either way, so the month should not depend on what a caller configured.
  return then.locale('th').format('DD MMM BB')
}
