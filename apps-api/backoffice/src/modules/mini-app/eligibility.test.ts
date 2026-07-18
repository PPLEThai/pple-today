import { MiniAppTier } from '@pple-today/database/prisma'
import { describe, expect, test } from 'vitest'

import { MiniAppForListing, selectVisibleMiniApps } from './eligibility'

const OWNER_SUB = 'owner-sub'
const OTHER_SUB = 'other-sub'
const MEMBER_ROLE = 'pple-ad:member'

const makeMiniApp = (overrides: Partial<MiniAppForListing> = {}): MiniAppForListing => ({
  slug: 'mini-app',
  name: 'Mini App',
  icon: null,
  order: 0,
  clientUrl: 'https://mini.example.com',
  requiresAuth: true,
  tier: MiniAppTier.LIVE,
  ownerSub: null,
  miniAppRoles: [],
  ...overrides,
})

const visibleSlugs = (miniApps: MiniAppForListing[], roles: string[], userSub: string | null) =>
  selectVisibleMiniApps(miniApps, roles, userSub).map((app) => app.slug)

describe('selectVisibleMiniApps tier eligibility', () => {
  describe('LIVE tier (existing role-based visibility is unchanged)', () => {
    test('an app with no required roles is visible to everyone, including anonymous', () => {
      const miniApps = [makeMiniApp({ slug: 'public-live', tier: MiniAppTier.LIVE })]

      expect(visibleSlugs(miniApps, [], null)).toEqual(['public-live'])
      expect(visibleSlugs(miniApps, [MEMBER_ROLE], OWNER_SUB)).toEqual(['public-live'])
    })

    test('a role-gated app is visible only to users holding a matching role', () => {
      const miniApps = [
        makeMiniApp({
          slug: 'members-only',
          tier: MiniAppTier.LIVE,
          miniAppRoles: [{ role: MEMBER_ROLE }],
        }),
      ]

      expect(visibleSlugs(miniApps, [MEMBER_ROLE], null)).toEqual(['members-only'])
      expect(visibleSlugs(miniApps, ['pple-ad:staff'], null)).toEqual([])
      expect(visibleSlugs(miniApps, [], null)).toEqual([])
    })
  })

  describe('DRAFT tier (owner-only)', () => {
    test('is visible only to its owner — not other users, not anonymous', () => {
      const miniApps = [
        makeMiniApp({ slug: 'my-draft', tier: MiniAppTier.DRAFT, ownerSub: OWNER_SUB }),
      ]

      expect(visibleSlugs(miniApps, [], OWNER_SUB)).toEqual(['my-draft'])
      expect(visibleSlugs(miniApps, [MEMBER_ROLE], OTHER_SUB)).toEqual([])
      expect(visibleSlugs(miniApps, [], null)).toEqual([])
    })
  })

  describe('BETA tier (owner-only for now; invitees come later)', () => {
    test('is visible only to its owner — not other users, not anonymous', () => {
      const miniApps = [
        makeMiniApp({ slug: 'my-beta', tier: MiniAppTier.BETA, ownerSub: OWNER_SUB }),
      ]

      expect(visibleSlugs(miniApps, [], OWNER_SUB)).toEqual(['my-beta'])
      expect(visibleSlugs(miniApps, [MEMBER_ROLE], OTHER_SUB)).toEqual([])
      expect(visibleSlugs(miniApps, [], null)).toEqual([])
    })
  })

  test('a user sees the union of their eligible apps across tiers', () => {
    const miniApps = [
      makeMiniApp({ slug: 'public-live', tier: MiniAppTier.LIVE }),
      makeMiniApp({ slug: 'my-draft', tier: MiniAppTier.DRAFT, ownerSub: OWNER_SUB }),
      makeMiniApp({ slug: 'someones-draft', tier: MiniAppTier.DRAFT, ownerSub: OTHER_SUB }),
    ]

    expect(visibleSlugs(miniApps, [], OWNER_SUB)).toEqual(['public-live', 'my-draft'])
  })

  test('the listing carries the tier so the client can badge non-LIVE apps', () => {
    const miniApps = [
      makeMiniApp({ slug: 'my-draft', tier: MiniAppTier.DRAFT, ownerSub: OWNER_SUB }),
    ]

    expect(selectVisibleMiniApps(miniApps, [], OWNER_SUB)).toEqual([
      {
        slug: 'my-draft',
        name: 'Mini App',
        iconUrl: null,
        order: 0,
        url: 'https://mini.example.com',
        requiresAuth: true,
        tier: MiniAppTier.DRAFT,
      },
    ])
  })
})
