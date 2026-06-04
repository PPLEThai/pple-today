import { Check } from '@sinclair/typebox/value'
import { describe, expect, test } from 'vitest'

import { AdUserInfo, resolveVisibleRoles } from './sso-ad'

// Trimmed shape of GET /oidc/v1/userinfo for a user with an active role.
const userInfoWithActiveRole = {
  sub: '000000000000000000',
  name: 'Test User',
  phone_number: '+66800000000',
  ad: {
    user: {
      id: 1,
      role: 'mp',
      metadata: {
        ad: {
          mp_type: 'candidate',
          province: 'Test Province',
          extra_roles: ['ad:admin'],
        },
        admin: true,
      },
    },
    activeRole: 'mp',
    roleMapping: { mp: 'สส.', 'ad:admin': '[AD] Admin' },
    eligibleRoles: ['mp', 'delegate', 'hq'],
  },
}

describe('AdUserInfo schema', () => {
  test('accepts the userinfo response (ignores extra fields)', () => {
    expect(Check(AdUserInfo, userInfoWithActiveRole)).toBe(true)
  })

  test('accepts a userinfo response without an ad block', () => {
    expect(Check(AdUserInfo, { sub: 'x', name: 'y' })).toBe(true)
  })
})

describe('resolveVisibleRoles', () => {
  test('returns the prefixed union of main role and extra roles', () => {
    expect(resolveVisibleRoles(userInfoWithActiveRole)).toEqual(['pple-ad:mp', 'pple-ad:ad:admin'])
  })

  test('returns just the main role when there are no extra roles', () => {
    expect(resolveVisibleRoles({ ad: { user: { role: 'hq' } } })).toEqual(['pple-ad:hq'])
  })

  test('returns an empty list when there is no active role', () => {
    expect(resolveVisibleRoles({})).toEqual([])
    expect(resolveVisibleRoles({ ad: null })).toEqual([])
    expect(resolveVisibleRoles({ ad: { activeRole: null, user: null } })).toEqual([])
  })
})
