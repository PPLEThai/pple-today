import { describe, expect, test } from 'vitest'

import { pathnameToMiniAppRoute, resolveIncomingDeepLinkPathname } from './mini-app-path'

describe('pathnameToMiniAppRoute', () => {
  test('maps slug only', () => {
    expect(pathnameToMiniAppRoute('/my-slug')).toBe('/mini-app/my-slug')
  })

  test('maps slug with nested path', () => {
    expect(pathnameToMiniAppRoute('/my-slug/nested/path')).toBe(
      '/mini-app/my-slug?path=nested/path'
    )
  })

  test('returns null for root', () => {
    expect(pathnameToMiniAppRoute('/')).toBeNull()
  })

  // The pathname is server data, and an API deployed before the field it comes
  // from omits it — the screen that asked must render without it, not throw.
  test('returns null for an absent pathname', () => {
    expect(pathnameToMiniAppRoute(undefined as unknown as string)).toBeNull()
    expect(pathnameToMiniAppRoute('')).toBeNull()
  })
})

describe('resolveIncomingDeepLinkPathname', () => {
  test('maps universal link pathname', () => {
    expect(resolveIncomingDeepLinkPathname('/campaign/register')).toBe(
      '/mini-app/campaign?path=register'
    )
  })

  // PPLE ID opens the app with the bare scheme to nudge people into turning
  // notifications on. Every installed version must route that to home, never
  // read it as a mini-app slug.
  test('leaves the bare app scheme to the home screen', () => {
    expect(resolveIncomingDeepLinkPathname('pple-today://')).toBeNull()
    expect(resolveIncomingDeepLinkPathname('/')).toBeNull()
    expect(resolveIncomingDeepLinkPathname('')).toBeNull()
  })
})
