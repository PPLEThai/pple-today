import { afterEach, describe, expect, test, vi } from 'vitest'

import { PPLEMiniApp } from './index'

const config = {
  oauthUrl: 'https://sso.example.com',
  oauthClientId: 'client-id',
  oauthRedirectUri: 'https://miniapp.example.com/callback',
}

const memoryStorage = (): Storage => {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => Array.from(items.keys())[index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  }
}

const createMiniApp = (userAgent: string, search: string) => {
  vi.stubGlobal('navigator', { userAgent })
  vi.stubGlobal('window', {
    location: { search, href: `https://miniapp.example.com/${search}` },
    localStorage: memoryStorage(),
    sessionStorage: memoryStorage(),
  })
  return new PPLEMiniApp(config)
}

const browserUserAgent =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PPLEMiniApp.isMiniApp', () => {
  test.each(['2.9.0', '2.10.0', '10.0.0'])(
    'is true for PPLE Today %s with an access_token',
    (version) => {
      const miniApp = createMiniApp(
        `${browserUserAgent} PPLETodayApp/${version} MiniApp`,
        '?access_token=token'
      )

      expect(miniApp.isMiniApp()).toBe(true)
    }
  )

  test.each(['2.9.0', '2.10.0', '10.0.0'])(
    'is false for PPLE Today %s without an access_token',
    (version) => {
      const miniApp = createMiniApp(`${browserUserAgent} PPLETodayApp/${version} MiniApp`, '')

      expect(miniApp.isMiniApp()).toBe(false)
    }
  )

  test('is false for a plain browser with an access_token', () => {
    const miniApp = createMiniApp(browserUserAgent, '?access_token=token')

    expect(miniApp.isMiniApp()).toBe(false)
  })

  test('is false for a plain browser without an access_token', () => {
    const miniApp = createMiniApp(browserUserAgent, '')

    expect(miniApp.isMiniApp()).toBe(false)
  })
})
