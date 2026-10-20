import { describe, expect, test } from 'vitest'

import { pickMiniAppForPage } from './mini-app-page-match'

const app = (id: string, clientUrl: string) => ({ id, clientUrl })

describe('pickMiniAppForPage', () => {
  test('matches an app at the page’s origin after a server redirect changed the path', () => {
    const apps = [app('a', 'https://a.pplethai.org')]

    expect(pickMiniAppForPage(apps, 'https://a.pplethai.org/th/home?x=1')?.id).toBe('a')
  })

  test('never matches another origin, even a subdomain', () => {
    const apps = [app('a', 'https://pplethai.org')]

    expect(pickMiniAppForPage(apps, 'https://evil.pplethai.org/')).toBeNull()
    expect(pickMiniAppForPage(apps, 'http://pplethai.org/')).toBeNull()
  })

  test('the longest base-path prefix wins among apps on one origin', () => {
    const apps = [
      app('root', 'https://kaitom.pplethai.org'),
      app('mp', 'https://kaitom.pplethai.org/mp/'),
      app('mpx', 'https://kaitom.pplethai.org/mpx'),
    ]

    expect(pickMiniAppForPage(apps, 'https://kaitom.pplethai.org/mp/attendances')?.id).toBe('mp')
    expect(pickMiniAppForPage(apps, 'https://kaitom.pplethai.org/mp')?.id).toBe('mp')
    expect(pickMiniAppForPage(apps, 'https://kaitom.pplethai.org/mpx/a')?.id).toBe('mpx')
    expect(pickMiniAppForPage(apps, 'https://kaitom.pplethai.org/other')?.id).toBe('root')
  })

  test('falls back to an app at the origin when no base path covers the page', () => {
    const apps = [app('mp', 'https://kaitom.pplethai.org/mp')]

    expect(pickMiniAppForPage(apps, 'https://kaitom.pplethai.org/th/mp')?.id).toBe('mp')
  })

  test('rejects unparseable and non-web URLs', () => {
    const apps = [app('a', 'https://a.pplethai.org')]

    expect(pickMiniAppForPage(apps, 'not a url')).toBeNull()
    expect(pickMiniAppForPage(apps, 'about:blank')).toBeNull()
    expect(pickMiniAppForPage([app('d', 'data:text/html,x')], 'data:text/html,x')).toBeNull()
  })
})
