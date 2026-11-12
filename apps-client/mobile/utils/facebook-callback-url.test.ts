import { describe, expect, test } from 'vitest'

import { isFacebookCallbackUrl } from './facebook-callback-url'

describe('isFacebookCallbackUrl', () => {
  test('matches the Facebook Login callback scheme', () => {
    expect(isFacebookCallbackUrl('fb1234567890://authorize/#access_token=abc&state=x')).toBe(true)
    expect(isFacebookCallbackUrl('fb1234567890://authorize/?error=access_denied')).toBe(true)
    expect(isFacebookCallbackUrl('FB1234567890://authorize')).toBe(true)
  })

  test('ignores app links and paths', () => {
    expect(isFacebookCallbackUrl('pple-today://profile')).toBe(false)
    expect(isFacebookCallbackUrl('https://facebook.com/some-page')).toBe(false)
    expect(isFacebookCallbackUrl('/profile/facebook')).toBe(false)
    expect(isFacebookCallbackUrl('fb-messenger://share')).toBe(false)
  })
})
