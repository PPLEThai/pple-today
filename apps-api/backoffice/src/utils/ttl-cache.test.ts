import { describe, expect, test } from 'vitest'

import { TtlCache } from './ttl-cache'

const clock = () => {
  let t = 0
  return { now: () => t, advance: (ms: number) => (t += ms) }
}

describe('TtlCache', () => {
  test('returns a value until its TTL passes, then forgets it', () => {
    const c = clock()
    const cache = new TtlCache<string>({ ttlMs: 1000, maxEntries: 10, now: c.now })

    cache.set('a', 'A')
    c.advance(999)
    expect(cache.get('a')).toBe('A')

    c.advance(1)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.size).toBe(0)
  })

  test('drops the oldest entry when full', () => {
    const cache = new TtlCache<number>({ ttlMs: 1000, maxEntries: 2 })

    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('c', 3)

    expect(cache.has('a')).toBe(false)
    expect(cache.get('b')).toBe(2)
    expect(cache.get('c')).toBe(3)
  })

  test('re-setting a key refreshes its age, so it is not the next evicted', () => {
    const cache = new TtlCache<number>({ ttlMs: 1000, maxEntries: 2 })

    cache.set('a', 1)
    cache.set('b', 2)
    cache.set('a', 1)
    cache.set('c', 3)

    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
  })
})
