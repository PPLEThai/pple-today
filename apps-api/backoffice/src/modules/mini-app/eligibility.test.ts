import { MiniAppTier } from '@pple-today/database/prisma'
import { describe, expect, test } from 'vitest'

import { MiniAppForListing, MiniAppViewer, selectVisibleMiniApps } from './eligibility'

const OWNER_SUB = 'owner-sub'
const OTHER_SUB = 'other-sub'
const INVITEE_SUB = 'invitee-sub'
const MEMBER_ROLE = 'pple-ad:member'

const makeMiniApp = (overrides: Partial<MiniAppForListing> = {}): MiniAppForListing => ({
  id: 'mini-app-id',
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

const makeViewer = (overrides: Partial<MiniAppViewer> = {}): MiniAppViewer => ({
  roles: [],
  sub: null,
  acceptedInviteMiniAppIds: new Set(),
  ...overrides,
})

const visibleSlugs = (miniApps: MiniAppForListing[], viewer: MiniAppViewer) =>
  selectVisibleMiniApps(miniApps, viewer).map((app) => app.slug)

describe('selectVisibleMiniApps tier eligibility', () => {
  describe('LIVE tier (existing role-based visibility is unchanged)', () => {
    test('an app with no required roles is visible to everyone, including anonymous', () => {
      const miniApps = [makeMiniApp({ slug: 'public-live', tier: MiniAppTier.LIVE })]

      expect(visibleSlugs(miniApps, makeViewer())).toEqual(['public-live'])
      expect(visibleSlugs(miniApps, makeViewer({ roles: [MEMBER_ROLE], sub: OWNER_SUB }))).toEqual([
        'public-live',
      ])
    })

    test('a role-gated app is visible only to users holding a matching role', () => {
      const miniApps = [
        makeMiniApp({
          slug: 'members-only',
          tier: MiniAppTier.LIVE,
          miniAppRoles: [{ role: MEMBER_ROLE }],
        }),
      ]

      expect(visibleSlugs(miniApps, makeViewer({ roles: [MEMBER_ROLE] }))).toEqual(['members-only'])
      expect(visibleSlugs(miniApps, makeViewer({ roles: ['pple-ad:staff'] }))).toEqual([])
      expect(visibleSlugs(miniApps, makeViewer())).toEqual([])
    })

    test('an accepted invite does not bypass LIVE role gating', () => {
      const miniApps = [
        makeMiniApp({
          id: 'live-id',
          slug: 'members-only',
          tier: MiniAppTier.LIVE,
          miniAppRoles: [{ role: MEMBER_ROLE }],
        }),
      ]

      const viewer = makeViewer({
        sub: INVITEE_SUB,
        acceptedInviteMiniAppIds: new Set(['live-id']),
      })

      expect(visibleSlugs(miniApps, viewer)).toEqual([])
    })
  })

  describe('DRAFT tier (owner-only)', () => {
    test('is visible only to its owner — not other users, not anonymous', () => {
      const miniApps = [
        makeMiniApp({ slug: 'my-draft', tier: MiniAppTier.DRAFT, ownerSub: OWNER_SUB }),
      ]

      expect(visibleSlugs(miniApps, makeViewer({ sub: OWNER_SUB }))).toEqual(['my-draft'])
      expect(visibleSlugs(miniApps, makeViewer({ roles: [MEMBER_ROLE], sub: OTHER_SUB }))).toEqual(
        []
      )
      expect(visibleSlugs(miniApps, makeViewer())).toEqual([])
    })

    test('an accepted invite does not make a DRAFT app visible — only BETA takes invitees', () => {
      const miniApps = [
        makeMiniApp({
          id: 'draft-id',
          slug: 'my-draft',
          tier: MiniAppTier.DRAFT,
          ownerSub: OWNER_SUB,
        }),
      ]

      const viewer = makeViewer({
        sub: INVITEE_SUB,
        acceptedInviteMiniAppIds: new Set(['draft-id']),
      })

      expect(visibleSlugs(miniApps, viewer)).toEqual([])
    })
  })

  describe('BETA tier (owner plus accepted invitees)', () => {
    const betaApp = makeMiniApp({
      id: 'beta-id',
      slug: 'my-beta',
      tier: MiniAppTier.BETA,
      ownerSub: OWNER_SUB,
    })

    test('is visible to its owner', () => {
      expect(visibleSlugs([betaApp], makeViewer({ sub: OWNER_SUB }))).toEqual(['my-beta'])
    })

    test('is visible to a tester whose accepted invite is bound to their account', () => {
      const viewer = makeViewer({
        sub: INVITEE_SUB,
        acceptedInviteMiniAppIds: new Set(['beta-id']),
      })

      expect(visibleSlugs([betaApp], viewer)).toEqual(['my-beta'])
    })

    test('is not visible to a user with no accepted invite — pending and declined alike', () => {
      // Pending and declined invites never reach the accepted set, so both
      // present here as an empty set: an invitation the tester has not
      // consented to must not put the app on their home screen.
      expect(visibleSlugs([betaApp], makeViewer({ sub: INVITEE_SUB }))).toEqual([])
    })

    test('is not visible to an invitee of a *different* beta app', () => {
      const viewer = makeViewer({
        sub: INVITEE_SUB,
        acceptedInviteMiniAppIds: new Set(['some-other-beta-id']),
      })

      expect(visibleSlugs([betaApp], viewer)).toEqual([])
    })

    test('is not visible to anonymous users', () => {
      expect(visibleSlugs([betaApp], makeViewer())).toEqual([])
    })
  })

  test('a user sees the union of their eligible apps across tiers', () => {
    const miniApps = [
      makeMiniApp({ id: 'live-id', slug: 'public-live', tier: MiniAppTier.LIVE }),
      makeMiniApp({
        id: 'draft-id',
        slug: 'my-draft',
        tier: MiniAppTier.DRAFT,
        ownerSub: OWNER_SUB,
      }),
      makeMiniApp({
        id: 'other-draft-id',
        slug: 'someones-draft',
        tier: MiniAppTier.DRAFT,
        ownerSub: OTHER_SUB,
      }),
      makeMiniApp({
        id: 'invited-beta-id',
        slug: 'invited-beta',
        tier: MiniAppTier.BETA,
        ownerSub: OTHER_SUB,
      }),
    ]

    const viewer = makeViewer({
      sub: OWNER_SUB,
      acceptedInviteMiniAppIds: new Set(['invited-beta-id']),
    })

    expect(visibleSlugs(miniApps, viewer)).toEqual(['public-live', 'my-draft', 'invited-beta'])
  })

  test('the listing carries the tier so the client can badge non-LIVE apps', () => {
    const miniApps = [
      makeMiniApp({ slug: 'my-draft', tier: MiniAppTier.DRAFT, ownerSub: OWNER_SUB }),
    ]

    expect(selectVisibleMiniApps(miniApps, makeViewer({ sub: OWNER_SUB }))).toEqual([
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
