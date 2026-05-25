import { describe, expect, test } from 'vitest'

import { buildMiniAppRedirectUrl, parseMiniAppRequestPath } from './build-url'

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
