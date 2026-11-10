import { describe, expect, test } from 'vitest'

import { liveActivityRegistrationFields, pendingActionFromParams } from './live-activity'

describe('liveActivityRegistrationFields', () => {
  test('is empty on Android', () => {
    expect(liveActivityRegistrationFields('android', { startToken: 'ab', enabled: true })).toEqual(
      {}
    )
  })

  test('is empty when unsupported', () => {
    expect(liveActivityRegistrationFields('ios', null)).toEqual({})
    expect(liveActivityRegistrationFields('ios', undefined)).toEqual({})
  })

  test('sends the token and enablement', () => {
    expect(liveActivityRegistrationFields('ios', { startToken: 'ab12ef', enabled: true })).toEqual({
      liveActivityStartToken: 'ab12ef',
      liveActivitiesEnabled: true,
    })
  })

  test('lowercases the token', () => {
    expect(liveActivityRegistrationFields('ios', { startToken: 'AB12', enabled: false })).toEqual({
      liveActivityStartToken: 'ab12',
      liveActivitiesEnabled: false,
    })
  })

  test('omits a missing or malformed token but still reports enablement', () => {
    expect(liveActivityRegistrationFields('ios', { startToken: null, enabled: true })).toEqual({
      liveActivitiesEnabled: true,
    })
    expect(liveActivityRegistrationFields('ios', { startToken: '', enabled: false })).toEqual({
      liveActivitiesEnabled: false,
    })
    expect(liveActivityRegistrationFields('ios', { startToken: 'xyz', enabled: true })).toEqual({
      liveActivitiesEnabled: true,
    })
  })
})

describe('pendingActionFromParams', () => {
  test('reads pendingActionId (tray)', () => {
    expect(pendingActionFromParams({ pendingActionId: 'approve' })).toBe('approve')
  })

  test('reads action (Live Activity deep link)', () => {
    expect(pendingActionFromParams({ notificationId: 'n1', action: 'approve' })).toBe('approve')
  })

  test('prefers pendingActionId and takes the first of an array', () => {
    expect(pendingActionFromParams({ pendingActionId: 'a', action: 'b' })).toBe('a')
    expect(pendingActionFromParams({ action: ['x', 'y'] })).toBe('x')
  })

  test('ignores empty and absent values', () => {
    expect(pendingActionFromParams({ action: '' })).toBeUndefined()
    expect(pendingActionFromParams({})).toBeUndefined()
  })
})
