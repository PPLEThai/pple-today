import dayjs from 'dayjs'

export function formatDateInterval(date: string): string {
  const now = new Date()
  const diff = dayjs(now).diff(dayjs(date))
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  if (weeks > 2) {
    return dayjs(date).format('D MMM BBBB')
  }
  if (weeks > 0) {
    return `${weeks} สัปดาห์`
  }
  if (days > 0) {
    return `${days} วัน`
  }
  if (hours > 0) {
    return `${hours} ชั่วโมง`
  }
  if (minutes > 0) {
    return `${minutes} นาที`
  } else {
    return `1 นาที`
  }
}
