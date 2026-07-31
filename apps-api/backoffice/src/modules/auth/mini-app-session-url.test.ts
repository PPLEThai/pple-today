import { describe, expect, test } from 'vitest'

import { buildMiniAppSessionUrl } from './mini-app-session-url'

const TOKENS = {
  accessToken: 'AT',
  expiresIn: 3600,
  idToken: 'IT',
  tokenType: 'Bearer',
}

const pathOf = (url: string) => new URL(url).pathname

describe('buildMiniAppSessionUrl', () => {
  test('joins the deep-link path under the app’s registered base path', () => {
    // Regression: `url.pathname = path` sent this to /attendances, outside the
    // app's own module, and the SPA bounced it to a login page.
    const url = buildMiniAppSessionUrl(
      'https://kaitom-miniapp.pplethai.org/mp',
      TOKENS,
      'attendances'
    )

    expect(pathOf(url)).toBe('/mp/attendances')
  })

  test('a nested path stays under the base path', () => {
    const url = buildMiniAppSessionUrl(
      'https://kaitom-miniapp.pplethai.org/field-report',
      TOKENS,
      'reports/42/edit'
    )

    expect(pathOf(url)).toBe('/field-report/reports/42/edit')
  })

  test('a leading slash on the path does not escape the base path', () => {
    const url = buildMiniAppSessionUrl(
      'https://kaitom-miniapp.pplethai.org/mp',
      TOKENS,
      '/attendances'
    )

    expect(pathOf(url)).toBe('/mp/attendances')
  })

  test('a root-hosted app is unchanged by the join', () => {
    const url = buildMiniAppSessionUrl('https://app.example.com', TOKENS, 'foo/bar')

    expect(pathOf(url)).toBe('/foo/bar')
  })

  test('a trailing slash on clientUrl does not double up', () => {
    const url = buildMiniAppSessionUrl(
      'https://kaitom-miniapp.pplethai.org/mp/',
      TOKENS,
      'attendances'
    )

    expect(pathOf(url)).toBe('/mp/attendances')
  })

  test('no path opens the app at its registered entry', () => {
    const url = buildMiniAppSessionUrl('https://kaitom-miniapp.pplethai.org/mp', TOKENS)

    expect(pathOf(url)).toBe('/mp')
  })

  test('the session tokens ride along', () => {
    const url = new URL(
      buildMiniAppSessionUrl('https://kaitom-miniapp.pplethai.org/mp', TOKENS, 'attendances')
    )

    expect(url.searchParams.get('access_token')).toBe('AT')
    expect(url.searchParams.get('expires_in')).toBe('3600')
    expect(url.searchParams.get('id_token')).toBe('IT')
    expect(url.searchParams.get('token_type')).toBe('Bearer')
  })
})
