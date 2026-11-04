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

describe('PPLEMiniApp KYC', () => {
  const stubBrowser = (href: string) => {
    const url = new URL(href)
    const assign = vi.fn()
    const replaceState = vi.fn()
    vi.stubGlobal('navigator', { userAgent: browserUserAgent })
    vi.stubGlobal('window', {
      location: { search: url.search, href, assign },
      history: { state: { key: 'router' }, replaceState },
      localStorage: memoryStorage(),
      sessionStorage: memoryStorage(),
    })
    return { assign, replaceState }
  }

  test('startKyc sends the user to PPLE ID with the current page as return_to', () => {
    const { assign } = stubBrowser(
      'https://miniapp.example.com/shop?access_token=a&id_token=b&token_type=Bearer&expires_in=3600&kyc=cancelled&item=7#cart'
    )

    new PPLEMiniApp(config).startKyc()

    const target = new URL(assign.mock.calls[0][0])
    expect(target.origin + target.pathname).toBe('https://sso.example.com/kyc')
    expect(target.searchParams.get('client_id')).toBe('client-id')
    expect(target.searchParams.get('return_to')).toBe(
      'https://miniapp.example.com/shop?item=7#cart'
    )
  })

  test('startKyc uses the given returnTo', () => {
    const { assign } = stubBrowser('https://miniapp.example.com/shop')

    new PPLEMiniApp(config).startKyc({ returnTo: '/verified?kyc=passed' })

    const target = new URL(assign.mock.calls[0][0])
    expect(target.searchParams.get('return_to')).toBe('https://miniapp.example.com/verified')
  })

  test.each(['passed', 'pending_review', 'cancelled'] as const)(
    'consumeKycResult returns %s and removes it from the URL',
    (result) => {
      const { replaceState } = stubBrowser(
        `https://miniapp.example.com/shop?kyc=${result}&item=7#cart`
      )
      const miniApp = new PPLEMiniApp(config)

      expect(miniApp.consumeKycResult()).toBe(result)
      expect(replaceState).toHaveBeenCalledWith(
        { key: 'router' },
        '',
        'https://miniapp.example.com/shop?item=7#cart'
      )
    }
  )

  test('consumeKycResult reads the launch URL even after the router rewrote it', () => {
    stubBrowser('https://miniapp.example.com/shop?kyc=passed')
    const miniApp = new PPLEMiniApp(config)
    window.location.href = 'https://miniapp.example.com/th/shop'

    expect(miniApp.consumeKycResult()).toBe('passed')
    expect(window.history.replaceState).not.toHaveBeenCalled()
  })

  test('consumeKycResult is null without a known result', () => {
    stubBrowser('https://miniapp.example.com/shop')
    expect(new PPLEMiniApp(config).consumeKycResult()).toBeNull()

    const { replaceState } = stubBrowser('https://miniapp.example.com/shop?kyc=bogus')
    expect(new PPLEMiniApp(config).consumeKycResult()).toBeNull()
    expect(replaceState).toHaveBeenCalled()
  })

  test.each([
    [undefined, 'openid profile phone'],
    [true, 'openid profile phone pple:kyc'],
  ])('kycOnSignIn %s requests scope "%s"', (kycOnSignIn, scope) => {
    stubBrowser('https://miniapp.example.com/')
    const miniApp = new PPLEMiniApp({ ...config, kycOnSignIn })

    expect((miniApp as unknown as { userManager: UserManager }).userManager.settings.scope).toBe(
      scope
    )
  })

  describe('getProfile', () => {
    const kyc = {
      status: 'verified',
      verified: true,
      verifiedAt: '2026-11-01T00:00:00Z',
      source: 'kyc',
    }

    const signedIn = async (href: string, userInfo: () => object) => {
      stubBrowser(href)
      const fetchMock = vi.fn(async () => Response.json(userInfo()))
      vi.stubGlobal('fetch', fetchMock)
      vi.spyOn(UserManager.prototype, 'signinCallback').mockRejectedValue(new Error('no callback'))
      vi.spyOn(UserManager.prototype, 'getUser').mockImplementation(async function (
        this: UserManager
      ) {
        const stored = await this.settings.userStore.get(
          `user:${config.oauthUrl}:${config.oauthClientId}`
        )
        return stored ? User.fromStorageString(stored) : null
      })
      vi.spyOn(UserManager.prototype, 'metadataService', 'get').mockReturnValue({
        getUserInfoEndpoint: async () => 'https://sso.example.com/userinfo',
      } as never)

      const miniApp = new PPLEMiniApp(config)
      const manager = (miniApp as unknown as { userManager: UserManager }).userManager
      await manager.storeUser(
        new User({
          access_token: 'access',
          token_type: 'Bearer',
          profile: { sub: 'user-1' } as never,
        })
      )
      await miniApp.init()
      return { miniApp, fetchMock }
    }

    afterEach(() => {
      vi.restoreAllMocks()
    })

    test('returns the kyc block', async () => {
      const { miniApp } = await signedIn('https://miniapp.example.com/', () => ({
        sub: 'user-1',
        kyc,
      }))

      expect((await miniApp.getProfile())?.kyc).toEqual(kyc)
    })

    test('has no kyc block when PPLE ID does not send one', async () => {
      const { miniApp } = await signedIn('https://miniapp.example.com/', () => ({ sub: 'user-1' }))

      expect((await miniApp.getProfile())?.kyc).toBeUndefined()
    })

    test('drops a kyc block it cannot read instead of failing', async () => {
      const { miniApp } = await signedIn('https://miniapp.example.com/', () => ({
        sub: 'user-1',
        kyc: { status: 'something-new' },
      }))

      const profile = await miniApp.getProfile()
      expect(profile?.sub).toBe('user-1')
      expect(profile?.kyc).toBeUndefined()
    })

    test('refreshProfile refetches userinfo', async () => {
      let status = 'none'
      const { miniApp, fetchMock } = await signedIn('https://miniapp.example.com/', () => ({
        sub: 'user-1',
        kyc: { ...kyc, status, verified: status === 'verified' },
      }))

      expect((await miniApp.getProfile())?.kyc?.status).toBe('none')
      status = 'verified'
      expect((await miniApp.refreshProfile())?.kyc?.status).toBe('verified')
      expect(fetchMock).toHaveBeenLastCalledWith('https://sso.example.com/userinfo', {
        headers: { Authorization: 'Bearer access' },
      })
    })
  })
})
