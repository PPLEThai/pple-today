import 'dayjs/locale/th'

import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(duration)
dayjs.extend(relativeTime)
dayjs.extend(timezone)
dayjs.tz.setDefault('Asia/Bangkok')

export const getRelativeTime = (time: Date) =>
  dayjs
    .duration(time.getTime() - Date.now())
    .locale('th')
    .humanize(true)

export default dayjs
