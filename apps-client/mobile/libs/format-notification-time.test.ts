import { describe, expect, test } from 'vitest'

import { formatNotificationTime } from './format-notification-time'

const NOW = '2026-07-30T12:00:00.000Z'
const ago = (amount: number, unit: 'second' | 'minute' | 'hour' | 'day') => {
  const ms = { second: 1000, minute: 60_000, hour: 3_600_000, day: 86_400_000 }[unit]
  return new Date(new Date(NOW).getTime() - amount * ms)
}

describe('formatNotificationTime', () => {
  test('counts a recent notification in the largest unit that applies', () => {
    expect(formatNotificationTime(ago(30, 'second'), NOW)).toBe('เมื่อสักครู่')
    expect(formatNotificationTime(ago(1, 'minute'), NOW)).toBe('1 นาทีที่แล้ว')
    expect(formatNotificationTime(ago(5, 'minute'), NOW)).toBe('5 นาทีที่แล้ว')
    expect(formatNotificationTime(ago(2, 'hour'), NOW)).toBe('2 ชั่วโมงที่แล้ว')
    expect(formatNotificationTime(ago(4, 'day'), NOW)).toBe('4 วันที่แล้ว')
  })

  // Each unit holds right up to the moment the next one is whole, so nothing
  // rounds up to a count the reader can contradict by looking at a clock.
  test('changes unit only when the larger one reaches 1', () => {
    expect(formatNotificationTime(ago(59, 'second'), NOW)).toBe('เมื่อสักครู่')
    expect(formatNotificationTime(ago(59, 'minute'), NOW)).toBe('59 นาทีที่แล้ว')
    expect(formatNotificationTime(ago(23, 'hour'), NOW)).toBe('23 ชั่วโมงที่แล้ว')
    expect(formatNotificationTime(ago(6, 'day'), NOW)).toBe('6 วันที่แล้ว')
  })

  test('dates anything a week or older, in the Buddhist era', () => {
    expect(formatNotificationTime(ago(7, 'day'), NOW)).toBe('23 ก.ค. 69')
    expect(formatNotificationTime('2025-01-05T08:00:00.000Z', NOW)).toBe('05 ม.ค. 68')
  })

  test('reads a clock running behind the server as just now', () => {
    expect(formatNotificationTime('2026-07-30T12:05:00.000Z', NOW)).toBe('เมื่อสักครู่')
  })
})
