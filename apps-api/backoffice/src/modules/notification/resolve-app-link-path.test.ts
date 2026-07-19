import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { describe, expect, test } from 'vitest'

import { resolveAppLinkPath } from './resolve-app-link-path'

const REDIRECT_ORIGIN = 'https://miniapp.peoplesparty.or.th'
const APP = { slug: 'canvassing' }

describe('resolveAppLinkPath', () => {
  test('joins a path-only linkPath onto this app’s redirect entry', () => {
    const result = resolveAppLinkPath('/foo', APP, REDIRECT_ORIGIN)

    expect(result._unsafeUnwrap()).toEqual({
      type: 'MINI_APP',
      destination: 'https://miniapp.peoplesparty.or.th/canvassing/foo',
    })
  })

  test('nested paths stay under this app’s slug', () => {
    const result = resolveAppLinkPath('/events/42/check-in', APP, REDIRECT_ORIGIN)

    expect(result._unsafeUnwrap()).toEqual({
      type: 'MINI_APP',
      destination: 'https://miniapp.peoplesparty.or.th/canvassing/events/42/check-in',
    })
  })

  test('“/” opens the app at its entry with no sub-path', () => {
    const result = resolveAppLinkPath('/', APP, REDIRECT_ORIGIN)

    expect(result._unsafeUnwrap()).toEqual({
      type: 'MINI_APP',
      destination: 'https://miniapp.peoplesparty.or.th/canvassing',
    })
  })

  test.each([
    ['missing leading slash', 'foo'],
    ['absolute https URL', 'https://evil.example/foo'],
    ['protocol-relative URL', '//evil.example/foo'],
    ['scheme with path', 'javascript:alert(1)'],
    ['parent segment', '/foo/../other-app'],
    ['dot segment', '/./foo'],
    ['encoded parent segment', '/foo/%2e%2e/bar'],
    ['query string', '/foo?x=1'],
    ['hash', '/foo#top'],
    ['empty', ''],
    ['whitespace', ' /foo'],
  ])('rejects %s', (_label, linkPath) => {
    const result = resolveAppLinkPath(linkPath, APP, REDIRECT_ORIGIN)

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_INVALID_LINK_PATH)
  })
})
