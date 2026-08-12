import { describe, expect, test } from 'vitest'

import { getRoleName } from './get-role-name'

describe('getRoleName', () => {
  test('uses the SSO public role when present', () => {
    expect(getRoleName(['pple-ad:mp'], 'สส. นนทบุรี เขต 1')).toBe('สส. นนทบุรี เขต 1')
  })

  test('falls back to the role name when there is no public role', () => {
    expect(getRoleName(['pple-ad:mp'])).toBe('สส.')
    expect(getRoleName(['pple-ad:mp'], null)).toBe('สส.')
  })

  test('does not use public role for a different matching role when unset', () => {
    expect(getRoleName(['pple-ad:hq'])).toBe('ส่วนกลาง')
  })
})
