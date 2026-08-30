import { describe, expect, test } from 'vitest'

import { isCmsAdmin } from './roles'

describe('isCmsAdmin', () => {
  test('admits the AD CMS admin role', () => {
    expect(isCmsAdmin(['pple-ad:hq', 'pple-ad:ppleToday:admin'])).toBe(true)
  })

  test('does not admit the retired Zitadel admin role', () => {
    // The migration in one assertion: `today-cms:admin` lives in the OIDC
    // token's `pple_roles`, a Zitadel mirror that does not follow a role
    // switch, so it no longer opens the CMS.
    expect(isCmsAdmin(['today-cms:admin'])).toBe(false)
  })

  test('does not admit a user with no roles, or with other AD roles', () => {
    expect(isCmsAdmin([])).toBe(false)
    expect(isCmsAdmin(['pple-ad:mp', 'pple-ad:ppleToday:allowFB'])).toBe(false)
  })
})
