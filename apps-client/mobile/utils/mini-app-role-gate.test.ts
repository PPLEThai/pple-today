import { describe, expect, test } from 'vitest'

import type { EligiblePerson } from './active-role'
import { preferredPersonForApp, roleMismatchFromError } from './mini-app-role-gate'

const person = (id: number, role: string, roleLabel = role): EligiblePerson => ({
  id,
  role,
  roleLabel,
  supervisorFullName: null,
  supervisorRoleLabel: null,
})

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

describe('preferredPersonForApp', () => {
  test('preselects a person whose role gets the user in, over the one they are wearing', () => {
    expect(
      preferredPersonForApp({
        eligiblePersons: [person(1, 'local'), person(2, 'mp')],
        requiredRoles: ['mp'],
        activePersonId: 1,
      })
    ).toBe(2)
  })

  test('matches roles the SSO reports by Thai label', () => {
    expect(
      preferredPersonForApp({
        eligiblePersons: [person(1, 'ทีมท้องถิ่น'), person(2, 'สส.')],
        requiredRoles: ['mp'],
        activePersonId: 1,
      })
    ).toBe(2)
  })

  test('two delegates stay two people — the first listed role that fits wins', () => {
    expect(
      preferredPersonForApp({
        eligiblePersons: [
          person(11, 'delegate', 'ปฎิบัติงานแทน'),
          person(12, 'delegate', 'ปฎิบัติงานแทน'),
        ],
        requiredRoles: ['delegate'],
        activePersonId: 12,
      })
    ).toBe(11)
  })

  test('keeps the current person when none of the eligible people fit', () => {
    expect(
      preferredPersonForApp({
        eligiblePersons: [person(1, 'local'), person(2, 'province')],
        requiredRoles: ['mp'],
        activePersonId: 2,
      })
    ).toBe(2)
  })

  test('keeps the current person even when they are not among the eligible rows', () => {
    expect(
      preferredPersonForApp({
        eligiblePersons: [person(1, 'local'), person(2, 'province')],
        requiredRoles: ['mp'],
        activePersonId: 99,
      })
    ).toBe(99)
  })

  test('falls back to the first eligible person when there is no current person', () => {
    expect(
      preferredPersonForApp({
        eligiblePersons: [person(1, 'local'), person(2, 'province')],
        requiredRoles: ['mp'],
        activePersonId: null,
      })
    ).toBe(1)
  })

  test('is null when there is nothing to choose between', () => {
    expect(
      preferredPersonForApp({ eligiblePersons: [], requiredRoles: [], activePersonId: null })
    ).toBeNull()
  })
})
