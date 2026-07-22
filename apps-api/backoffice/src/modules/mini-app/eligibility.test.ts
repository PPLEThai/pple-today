import { MiniAppTier } from '@pple-today/database/prisma'
import { describe, expect, test } from 'vitest'

import {
  isMiniAppAccessible,
  isMiniAppListable,
  MiniAppForListing,
  MiniAppViewer,
  selectVisibleMiniApps,
} from './eligibility'

const OWNER_SUB = 'owner-sub'
const COLLABORATOR_SUB = 'collaborator-sub'
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
  collaboratorSubs: [],
  unlisted: false,
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

describe('tier eligibility — listing', () => {
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

    test('an unlisted Live app is listed to no one — not even everyone-role holders', () => {
      const miniApps = [
        makeMiniApp({ slug: 'unlisted-live', tier: MiniAppTier.LIVE, unlisted: true }),
      ]

      // Would be public (empty roles) if listed, but unlisted hides it from all.
      expect(visibleSlugs(miniApps, makeViewer())).toEqual([])
      expect(visibleSlugs(miniApps, makeViewer({ roles: [MEMBER_ROLE], sub: OTHER_SUB }))).toEqual(
        []
      )
    })
  })

  describe('DRAFT tier (builders only)', () => {
    test('is visible to its owner — not other users, not anonymous', () => {
      const miniApps = [
        makeMiniApp({ slug: 'my-draft', tier: MiniAppTier.DRAFT, ownerSub: OWNER_SUB }),
      ]

      expect(visibleSlugs(miniApps, makeViewer({ sub: OWNER_SUB }))).toEqual(['my-draft'])
      expect(visibleSlugs(miniApps, makeViewer({ roles: [MEMBER_ROLE], sub: OTHER_SUB }))).toEqual(
        []
      )
      expect(visibleSlugs(miniApps, makeViewer())).toEqual([])
    })

    test('is visible to a Collaborator, not the Owner alone', () => {
      const miniApps = [
        makeMiniApp({
          slug: 'my-draft',
          tier: MiniAppTier.DRAFT,
          ownerSub: OWNER_SUB,
          collaboratorSubs: [COLLABORATOR_SUB],
        }),
      ]

      expect(visibleSlugs(miniApps, makeViewer({ sub: COLLABORATOR_SUB }))).toEqual(['my-draft'])
      // A non-builder still sees nothing.
      expect(visibleSlugs(miniApps, makeViewer({ sub: OTHER_SUB }))).toEqual([])
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

  describe('BETA tier (builders plus accepted invitees)', () => {
    const betaApp = makeMiniApp({
      id: 'beta-id',
      slug: 'my-beta',
      tier: MiniAppTier.BETA,
      ownerSub: OWNER_SUB,
    })

    test('is visible to its owner', () => {
      expect(visibleSlugs([betaApp], makeViewer({ sub: OWNER_SUB }))).toEqual(['my-beta'])
    })

    test('is visible to a Collaborator without spending an invite seat', () => {
      const withCollaborator = makeMiniApp({
        id: 'beta-id',
        slug: 'my-beta',
        tier: MiniAppTier.BETA,
        ownerSub: OWNER_SUB,
        collaboratorSubs: [COLLABORATOR_SUB],
      })

      // No accepted invite for the collaborator — being a builder is enough.
      expect(visibleSlugs([withCollaborator], makeViewer({ sub: COLLABORATOR_SUB }))).toEqual([
        'my-beta',
      ])
    })

    test('is visible to a tester whose accepted invite is bound to their account', () => {
      const viewer = makeViewer({
        sub: INVITEE_SUB,
        acceptedInviteMiniAppIds: new Set(['beta-id']),
      })

      expect(visibleSlugs([betaApp], viewer)).toEqual(['my-beta'])
    })

    test('is not visible to a user with no accepted invite — pending and declined alike', () => {
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

// Token exchange / first-open calls `isMiniAppAccessible` for a single looked-up
// app. Access is distinct from listing: an unlisted Live app opens by link but
// lists nowhere, and a role-restricted Live app still gates on roles.
describe('tier eligibility — access (token exchange / first-open)', () => {
  test('Draft: builders (Owner or Collaborator) may open, nobody else', () => {
    const draft = makeMiniApp({
      id: 'draft-id',
      tier: MiniAppTier.DRAFT,
      ownerSub: OWNER_SUB,
      collaboratorSubs: [COLLABORATOR_SUB],
    })

    expect(isMiniAppAccessible(draft, makeViewer({ sub: OWNER_SUB }))).toBe(true)
    expect(isMiniAppAccessible(draft, makeViewer({ sub: COLLABORATOR_SUB }))).toBe(true)
    expect(isMiniAppAccessible(draft, makeViewer({ sub: OTHER_SUB, roles: [MEMBER_ROLE] }))).toBe(
      false
    )
  })

  test('Beta: builders and accepted invitees may open; pending/declined may not', () => {
    const beta = makeMiniApp({
      id: 'beta-id',
      tier: MiniAppTier.BETA,
      ownerSub: OWNER_SUB,
      collaboratorSubs: [COLLABORATOR_SUB],
    })

    expect(isMiniAppAccessible(beta, makeViewer({ sub: OWNER_SUB }))).toBe(true)
    expect(isMiniAppAccessible(beta, makeViewer({ sub: COLLABORATOR_SUB }))).toBe(true)
    expect(
      isMiniAppAccessible(
        beta,
        makeViewer({ sub: INVITEE_SUB, acceptedInviteMiniAppIds: new Set(['beta-id']) })
      )
    ).toBe(true)
    expect(isMiniAppAccessible(beta, makeViewer({ sub: INVITEE_SUB }))).toBe(false)
  })

  test('Live: empty roles stay public; role gating is unchanged', () => {
    const publicLive = makeMiniApp({ tier: MiniAppTier.LIVE })
    const membersOnly = makeMiniApp({
      tier: MiniAppTier.LIVE,
      miniAppRoles: [{ role: MEMBER_ROLE }],
    })

    expect(isMiniAppAccessible(publicLive, makeViewer({ sub: OTHER_SUB }))).toBe(true)
    expect(isMiniAppAccessible(membersOnly, makeViewer({ roles: [MEMBER_ROLE] }))).toBe(true)
    expect(isMiniAppAccessible(membersOnly, makeViewer({ roles: ['pple-ad:staff'] }))).toBe(false)
  })

  test('Live unlisted: reachable by any authenticated member, but never anonymous', () => {
    const unlisted = makeMiniApp({ tier: MiniAppTier.LIVE, unlisted: true })

    // Any signed-in member with the link may open it, regardless of roles…
    expect(isMiniAppAccessible(unlisted, makeViewer({ sub: OTHER_SUB }))).toBe(true)
    // …but it is not listed to anyone.
    expect(isMiniAppListable(unlisted, makeViewer({ sub: OTHER_SUB }))).toBe(false)
    // Anonymous callers still cannot open it.
    expect(isMiniAppAccessible(unlisted, makeViewer())).toBe(false)
  })

  test('Live unlisted ignores role gating for access (reachable by link)', () => {
    const unlistedWithRoles = makeMiniApp({
      tier: MiniAppTier.LIVE,
      unlisted: true,
      miniAppRoles: [{ role: MEMBER_ROLE }],
    })

    // A member without the role can still open it by link…
    expect(isMiniAppAccessible(unlistedWithRoles, makeViewer({ sub: OTHER_SUB }))).toBe(true)
    // …yet it lists for no one.
    expect(
      isMiniAppListable(unlistedWithRoles, makeViewer({ sub: OTHER_SUB, roles: [MEMBER_ROLE] }))
    ).toBe(false)
  })
})
