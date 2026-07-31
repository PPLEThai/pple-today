import { describe, expect, test } from 'vitest'

import { miniAppUrlWithPath, pathnameToMiniAppRoute } from './mini-app-path'

const pathOf = (url: string) => new URL(url).pathname

describe('miniAppUrlWithPath', () => {
  test('joins the deep-link path under the app’s registered base path', () => {
    // Regression: `url.pathname = path` opened /attendances, outside the app's
    // own module, for every mini app hosted on a sub-path.
    expect(
      pathOf(miniAppUrlWithPath('https://kaitom-miniapp.pplethai.org/mp', 'attendances'))
    ).toBe('/mp/attendances')
  })

  test('a nested path stays under the base path', () => {
    expect(
      pathOf(miniAppUrlWithPath('https://kaitom-miniapp.pplethai.org/field-report', 'reports/42'))
    ).toBe('/field-report/reports/42')
  })

  test('a leading slash on the path does not escape the base path', () => {
    expect(
      pathOf(miniAppUrlWithPath('https://kaitom-miniapp.pplethai.org/mp', '/attendances'))
    ).toBe('/mp/attendances')
  })

  test('a root-hosted app is unchanged by the join', () => {
    expect(pathOf(miniAppUrlWithPath('https://app.example.com', 'foo/bar'))).toBe('/foo/bar')
  })

  test('no path opens the app at its registered entry', () => {
    expect(pathOf(miniAppUrlWithPath('https://kaitom-miniapp.pplethai.org/mp'))).toBe('/mp')
  })

  test('an existing query on the app URL survives the join', () => {
    const url = new URL(miniAppUrlWithPath('https://app.example.com/base?theme=dark', 'page'))

    expect(url.pathname).toBe('/base/page')
    expect(url.searchParams.get('theme')).toBe('dark')
  })
})

describe('pathnameToMiniAppRoute', () => {
  test('a sub-path becomes the route’s path query', () => {
    expect(pathnameToMiniAppRoute('/kaitom-mp/attendances')).toBe(
      '/mini-app/kaitom-mp?path=attendances'
    )
  })

  test('a slug alone opens the app at its entry', () => {
    expect(pathnameToMiniAppRoute('/kaitom-mp')).toBe('/mini-app/kaitom-mp')
  })

  test('no pathname resolves to no route', () => {
    expect(pathnameToMiniAppRoute('/')).toBeNull()
    expect(pathnameToMiniAppRoute('')).toBeNull()
  })
})
