import 'dayjs/locale/th'

import dayjs from 'dayjs'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(duration)
dayjs.extend(relativeTime)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Bangkok')
dayjs.extend(buddhistEra)

export const getRelativeTime = (time: Date) =>
  dayjs
    .duration(time.getTime() - Date.now())
    .locale('th')
    .humanize(true)

export default dayjs

export const formatDisplayDate = (date: Date) => dayjs(date).locale('th').format('DD/MM/BBBB')

export const getTimelineString = (start: Date, end: Date) =>
  `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`
