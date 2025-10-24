import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'

dayjs.extend(duration)

export function formatTimeInterval(diff: number) {
  const d = dayjs.duration(diff, 'seconds')
  const totalHours = d.asHours()
  const totalMinutes = d.asMinutes()
  const totalSeconds = d.asSeconds()
  if (totalHours >= 24) {
    return `${Math.floor(d.asDays())} วัน`
  } else if (totalHours >= 1) {
    return `${Math.floor(totalHours)} ชั่วโมง`
  } else if (totalMinutes >= 1) {
    return `${Math.floor(totalMinutes)} นาที`
  } else {
    return `${Math.floor(totalSeconds)} วินาที`
  }
}
