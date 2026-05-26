import { BannerInAppType } from '@pple-today/database/prisma'
import { describe, expect, test } from 'vitest'

import { inAppNavigationRequiresId } from './in-app-navigation'

describe('inAppNavigationRequiresId', () => {
  test('returns true for entity detail types', () => {
    expect(inAppNavigationRequiresId(BannerInAppType.POST)).toBe(true)
    expect(inAppNavigationRequiresId(BannerInAppType.ELECTION_VOTE)).toBe(true)
  })

  test('returns false for tab/list types', () => {
    expect(inAppNavigationRequiresId(BannerInAppType.OFFICIAL)).toBe(false)
    expect(inAppNavigationRequiresId(BannerInAppType.ANNOUNCEMENT_LIST)).toBe(false)
  })
})
