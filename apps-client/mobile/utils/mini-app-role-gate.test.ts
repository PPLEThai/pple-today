import { describe, expect, test } from 'vitest'

import { preferredRoleForApp, roleMismatchFromError } from './mini-app-role-gate'

const edenError = (code: string, data?: unknown) => ({
  status: 403,
  value: { error: { code, data } },
})

describe('roleMismatchFromError', () => {
  test('reads the app name and roles out of the role-mismatch response', () => {
    const error = edenError('MINI_APP_ROLE_NOT_ELIGIBLE', {
      appName: 'PPLE Vote',
      requiredRoles: ['pple-ad:mp', 'pple-ad:hq'],
    })

    expect(roleMismatchFromError(error)).toEqual({
      appName: 'PPLE Vote',
      // Canonical values, so the prompt can compare them against eligible roles.
      requiredRoles: ['mp', 'hq'],
    })
  })

  test('an app listed for no role at all still yields a usable prompt', () => {
    const error = edenError('MINI_APP_ROLE_NOT_ELIGIBLE', { appName: 'PPLE Vote' })

    expect(roleMismatchFromError(error)).toEqual({ appName: 'PPLE Vote', requiredRoles: [] })
  })

  test('every other failure stays an error — a missing app is still missing', () => {
    expect(roleMismatchFromError(edenError('MINI_APP_NOT_FOUND'))).toBeNull()
    expect(roleMismatchFromError(edenError('UNAUTHORIZED'))).toBeNull()
    expect(roleMismatchFromError(new Error('Network request failed'))).toBeNull()
    expect(roleMismatchFromError(null)).toBeNull()
  })

  test('the code alone is not enough — the prompt has to be able to name the app', () => {
    expect(roleMismatchFromError(edenError('MINI_APP_ROLE_NOT_ELIGIBLE'))).toBeNull()
  })
})

describe('preferredRoleForApp', () => {
  test('preselects a role that gets the user in, over the one they are wearing', () => {
    expect(
      preferredRoleForApp({
        eligibleRoles: ['local', 'mp'],
        requiredRoles: ['mp'],
        activeRole: 'local',
      })
    ).toBe('mp')
  })

  test('matches roles the SSO reports by Thai label', () => {
    expect(
      preferredRoleForApp({
        eligibleRoles: ['ทีมท้องถิ่น', 'สส.'],
        requiredRoles: ['mp'],
        activeRole: 'ทีมท้องถิ่น',
      })
    ).toBe('mp')
  })

  test('keeps the active role when none of the eligible roles fit', () => {
    expect(
      preferredRoleForApp({
        eligibleRoles: ['local', 'province'],
        requiredRoles: ['mp'],
        activeRole: 'province',
      })
    ).toBe('province')
  })

  test('falls back to the first eligible role when there is no active role', () => {
    expect(
      preferredRoleForApp({
        eligibleRoles: ['local', 'province'],
        requiredRoles: ['mp'],
        activeRole: null,
      })
    ).toBe('local')
  })

  test('is null when there is nothing to choose between', () => {
    expect(
      preferredRoleForApp({ eligibleRoles: [], requiredRoles: [], activeRole: null })
    ).toBeNull()
  })
})
