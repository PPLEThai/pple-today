import { describe, expect, test } from 'vitest'

import {
  buildMiniAppRedirectUrl,
  miniAppRedirectLocation,
  parseMiniAppRequestPath,
} from './build-url'

describe('buildMiniAppRedirectUrl', () => {
  test('redirects slug path and query to client url', () => {
    const result = buildMiniAppRedirectUrl(
      'https://appx.pplethai.org/main-path',
      'app-path',
      '?query=params',
      ''
    )

    expect(result).toBe('https://appx.pplethai.org/main-path/app-path?query=params')
  })

  test('redirects slug only to client url', () => {
    const result = buildMiniAppRedirectUrl('https://appx.pplethai.org/main-path/', '', '', '')

    expect(result).toBe('https://appx.pplethai.org/main-path')
  })

  test('preserves nested app paths and hash', () => {
    const result = buildMiniAppRedirectUrl(
      'https://appx.pplethai.org/main-path',
      'nested/app-path',
      '?a=1',
      '#section'
    )

    expect(result).toBe('https://appx.pplethai.org/main-path/nested/app-path?a=1#section')
  })
})

describe('miniAppRedirectLocation', () => {
  test('a Link Name carries path, query and hash the same way the slug does', () => {
    const clientUrl = 'https://donate.ppleth.ai'
    const byName = new URL('https://miniapp.peoplesparty.or.th/donate/a/b?x=1#h')
    const bySlug = new URL('https://miniapp.peoplesparty.or.th/brave-purple-lion/a/b?x=1#h')

    expect(miniAppRedirectLocation(byName, clientUrl)).toBe('https://donate.ppleth.ai/a/b?x=1#h')
    expect(miniAppRedirectLocation(bySlug, clientUrl)).toBe('https://donate.ppleth.ai/a/b?x=1#h')
  })
})

describe('parseMiniAppRequestPath', () => {
  test('parses slug and trailing path', () => {
    expect(parseMiniAppRequestPath('/abc/app-path')).toEqual({
      slug: 'abc',
      appPath: 'app-path',
    })
  })

  test('parses slug only', () => {
    expect(parseMiniAppRequestPath('/abc')).toEqual({
      slug: 'abc',
      appPath: '',
    })
  })

  test('returns null for root path', () => {
    expect(parseMiniAppRequestPath('/')).toBeNull()
  })
})
