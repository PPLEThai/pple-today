import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { Check } from '@sinclair/typebox/value'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { AdUserInfo, fetchAdVisibleRoles, resolveVisibleRoles } from './sso-ad'

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

describe('fetchAdVisibleRoles', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test("resolves the caller's roles from their own bearer token", async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(userInfoWithActiveRole), { status: 200 }))

    const result = await fetchAdVisibleRoles(
      { authorization: 'Bearer user-token' },
      'https://id.example.com'
    )

    expect(result._unsafeUnwrap()).toEqual(['pple-ad:mp', 'pple-ad:ad:admin'])
    expect(fetchMock).toHaveBeenCalledWith('https://id.example.com/oidc/v1/userinfo', {
      headers: { Authorization: 'Bearer user-token' },
    })
  })

  test('rejects a request with no authorization header', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    const result = await fetchAdVisibleRoles({}, 'https://id.example.com')

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.UNAUTHORIZED)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('surfaces an SSO failure as an error rather than an empty role list', async () => {
    // An empty list would read as "this user holds no roles" and silently deny
    // every AD-gated route; a broken dependency has to stay distinguishable.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 503 }))

    const result = await fetchAdVisibleRoles(
      { authorization: 'Bearer user-token' },
      'https://id.example.com'
    )

    expect(result.isErr()).toBe(true)
  })

  test('returns no roles for a user without an active role', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ sub: 'x', name: 'y' }), { status: 200 })
    )

    const result = await fetchAdVisibleRoles(
      { authorization: 'Bearer user-token' },
      'https://id.example.com'
    )

    expect(result._unsafeUnwrap()).toEqual([])
  })
})
