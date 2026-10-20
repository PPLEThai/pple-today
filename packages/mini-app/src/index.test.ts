import { User, UserManager } from 'oidc-client-ts'
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

describe('PPLEMiniApp.init in a browser', () => {
  const toBase64Url = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const now = Math.floor(Date.now() / 1000)
  const idToken = [
    toBase64Url({ alg: 'none' }),
    toBase64Url({
      sub: 'user-1',
      aud: 'client-id',
      iss: 'https://sso.example.com',
      iat: now,
      exp: now + 3600,
    }),
    'signature',
  ].join('.')

  test('removes the spent code and state from the URL after the exchange', async () => {
    const search = '?code=abc&state=xyz&iss=https%3A%2F%2Fsso.example.com&tab=news'
    const replaceState = vi.fn()
    vi.stubGlobal('navigator', { userAgent: browserUserAgent })
    vi.stubGlobal('window', {
      location: { search, href: `https://miniapp.example.com/callback${search}#top` },
      history: { state: { key: 'router' }, replaceState },
      localStorage: memoryStorage(),
      sessionStorage: memoryStorage(),
    })
    vi.spyOn(UserManager.prototype, 'signinCallback').mockResolvedValue(
      new User({
        access_token: 'access',
        id_token: idToken,
        token_type: 'Bearer',
        profile: {} as never,
      })
    )

    await new PPLEMiniApp(config).init()

    expect(replaceState).toHaveBeenCalledWith(
      { key: 'router' },
      '',
      'https://miniapp.example.com/callback?tab=news#top'
    )
  })
})
