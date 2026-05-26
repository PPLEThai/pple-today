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
})

describe('resolveIncomingDeepLinkPathname', () => {
  test('maps universal link pathname', () => {
    expect(resolveIncomingDeepLinkPathname('/campaign/register')).toBe(
      '/mini-app/campaign?path=register'
    )
  })
})
