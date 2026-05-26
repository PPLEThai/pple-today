import { describe, expect, test } from 'vitest'

import { getMobilePathFromInAppNavigation } from './in-app-navigation-path'

describe('getMobilePathFromInAppNavigation', () => {
  test('maps announcement detail to announcement route', () => {
    expect(getMobilePathFromInAppNavigation('ANNOUNCEMENT', 'feed-1')).toBe('/announcement/feed-1')
  })

  test('maps list/tab types to static routes', () => {
    expect(getMobilePathFromInAppNavigation('OFFICIAL', '')).toBe('/official')
    expect(getMobilePathFromInAppNavigation('ANNOUNCEMENT_LIST', '')).toBe('/announcement')
    expect(getMobilePathFromInAppNavigation('NOTIFICATION_LIST', '')).toBe('/notification')
  })

  test('maps election vote to vote screen', () => {
    expect(getMobilePathFromInAppNavigation('ELECTION_VOTE', 'election-1')).toBe(
      '/election/election-1/vote'
    )
  })

  test('maps notification detail', () => {
    expect(getMobilePathFromInAppNavigation('NOTIFICATION', 'notif-1')).toBe(
      '/notification/notif-1'
    )
  })
})
