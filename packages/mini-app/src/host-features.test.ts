import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const MINI_APP_UA = 'Mozilla/5.0 (iPhone) PPLETodayApp/2.17.0 MiniApp'

function host(options: { host?: unknown; userAgent?: string; withBridge?: boolean }) {
  const posted: Record<string, unknown>[] = []
  vi.stubGlobal('navigator', { userAgent: options.userAgent ?? MINI_APP_UA })
  vi.stubGlobal('window', {
    __ppleHost: options.host,
    ReactNativeWebView:
      options.withBridge === false
        ? undefined
        : { postMessage: (raw: string) => posted.push(JSON.parse(raw)) },
  })
  return posted
}

const caps = (capabilities: Record<string, unknown>) => ({ version: 1, capabilities })

// A fresh module each time: `ready()` remembers that it has been sent.
const load = async () => {
  vi.resetModules()
  return {
    ...(await import('./host-features')),
    ...(await import('./bridge')),
  }
}

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())

describe('getHostCapabilities / hasCapability', () => {
  test('reads the list at call time', async () => {
    const { getHostCapabilities, hasCapability } = await load()
    const posted = host({})
    void posted
    expect(getHostCapabilities()).toEqual({})
    ;(window as unknown as Record<string, unknown>).__ppleHost = caps({ saveFile: 1, haptics: 2 })
    expect(getHostCapabilities()).toEqual({ saveFile: 1, haptics: 2 })
    expect(hasCapability('saveFile')).toBe(true)
    expect(hasCapability('haptics', 2)).toBe(true)
    expect(hasCapability('haptics', 3)).toBe(false)
    expect(hasCapability('ready')).toBe(false)
  })

  test('is empty outside PPLE Today, without the bridge, or when malformed', async () => {
    const { getHostCapabilities } = await load()
    host({ host: caps({ saveFile: 1 }), userAgent: 'Mozilla/5.0 Mobile Safari' })
    expect(getHostCapabilities()).toEqual({})
    host({ host: caps({ saveFile: 1 }), withBridge: false })
    expect(getHostCapabilities()).toEqual({})
    for (const bad of [
      undefined,
      null,
      'x',
      1,
      {},
      { capabilities: null },
      { capabilities: 'x' },
    ]) {
      host({ host: bad })
      expect(getHostCapabilities()).toEqual({})
    }
    host({ host: caps({ saveFile: '1', haptics: NaN, ready: 1 }) })
    expect(getHostCapabilities()).toEqual({ ready: 1 })
  })
})

describe('haptic', () => {
  test('posts the style when the host offers haptics', async () => {
    const { haptic } = await load()
    const posted = host({ host: caps({ haptics: 1 }) })
    haptic('success')
    expect(posted).toEqual([{ type: 'pple:haptic', style: 'success', version: 1 }])
  })

  test('does nothing without the capability, outside PPLE Today, and never throws', async () => {
    const { haptic } = await load()
    const posted = host({ host: caps({ saveFile: 1 }) })
    haptic('light')
    host({ host: caps({ haptics: 1 }), userAgent: 'Safari' })
    haptic('light')
    expect(posted).toHaveLength(0)

    vi.stubGlobal('window', {
      __ppleHost: caps({ haptics: 1 }),
      ReactNativeWebView: {
        postMessage: () => {
          throw new Error('gone')
        },
      },
    })
    expect(() => haptic('heavy')).not.toThrow()
  })
})

describe('ready', () => {
  test('posts once, however often it is called', async () => {
    const { ready } = await load()
    const posted = host({ host: caps({ ready: 1 }) })
    ready()
    ready()
    expect(posted).toEqual([{ type: 'pple:ready', version: 1 }])
  })

  test('does nothing without the capability, and can still send once it appears', async () => {
    const { ready } = await load()
    const posted = host({ host: undefined })
    ready()
    expect(posted).toHaveLength(0)
    ;(window as unknown as Record<string, unknown>).__ppleHost = caps({ ready: 1 })
    ready()
    expect(posted).toHaveLength(1)
  })
})
