import { MiniAppTier } from '@pple-today/database/prisma'

import { ListMiniAppsResponse } from './models'

/**
 * The mini-app fields the tier-aware eligibility rules read — used by both
 * listing and token-exchange / first-open. Kept structural (rather than the
 * full Prisma row) so this module stays pure and unit-testable without the
 * plugin/config graph.
 */
export interface MiniAppForListing {
  id: string
  slug: string
  name: string
  icon: string | null
  order: number
  clientUrl: string
  requiresAuth: boolean
  tier: MiniAppTier
  ownerSub: string | null
  miniAppRoles: { role: string }[]
}

/**
 * Everything the eligibility rules know about the person asking. The mini-app
 * list itself is cached process-wide, so all per-user facts are gathered here
 * and passed in per request (listing and token exchange alike).
 */
export interface MiniAppViewer {
  /** `pple-ad:`-prefixed visible roles resolved from SSO AD. */
  roles: string[]
  /** The requesting user's PPLE ID `sub`, or `null` when anonymous. */
  sub: string | null
  /**
   * Mini apps this user has an ACCEPTED invite for. Invites are addressed by
   * phone number but bound to the account at accept time, so this set is
   * resolved by user id — which is why changing a phone number never revokes
   * access that was already consented to.
   */
  acceptedInviteMiniAppIds: ReadonlySet<string>
}

/**
 * The public listing shape returned to the client — derived from the response
 * DTO so the projection below and the schema in `models.ts` cannot drift apart.
 */
export type ListedMiniApp = ListMiniAppsResponse[number]

/**
 * Tier-aware eligibility for a single mini app — whether it may appear in the
 * caller's list and whether they may complete token exchange / first-open.
 * One matrix, both callers: do not invent a second tier filter elsewhere.
 *
 * - `LIVE`  — the established role-based rule: eligible for everyone when it
 *   has no required roles, otherwise only for users holding one of those
 *   roles. An invite grants nothing here; Live eligibility is roles only.
 * - `DRAFT` — owner only (`ownerSub === sub`), so a Builder sees and can open
 *   their own draft and nobody else can.
 * - `BETA`  — owner, or a tester holding an ACCEPTED invite bound to their
 *   account. A pending or declined invite grants nothing.
 */
export const isMiniAppVisible = (
  miniApp: Pick<MiniAppForListing, 'id' | 'tier' | 'ownerSub' | 'miniAppRoles'>,
  viewer: MiniAppViewer
): boolean => {
  const isOwner = viewer.sub !== null && miniApp.ownerSub === viewer.sub

  switch (miniApp.tier) {
    case MiniAppTier.LIVE:
      return (
        miniApp.miniAppRoles.length === 0 ||
        miniApp.miniAppRoles.some((miniAppRole) => viewer.roles.includes(miniAppRole.role))
      )
    case MiniAppTier.DRAFT:
      return isOwner
    case MiniAppTier.BETA:
      return isOwner || (viewer.sub !== null && viewer.acceptedInviteMiniAppIds.has(miniApp.id))
    default:
      return false
  }
}

/**
 * Filter a full mini-app list down to the apps visible to the requesting user
 * and shape them into the public listing DTO. Pure over its inputs so it can be
 * reused across cached requests with different viewers.
 */
export const selectVisibleMiniApps = (
  miniApps: MiniAppForListing[],
  viewer: MiniAppViewer
): ListedMiniApp[] =>
  miniApps
    .filter((miniApp) => isMiniAppVisible(miniApp, viewer))
    .map((miniApp) => ({
      slug: miniApp.slug,
      name: miniApp.name,
      iconUrl: miniApp.icon,
      order: miniApp.order,
      url: miniApp.clientUrl,
      requiresAuth: miniApp.requiresAuth,
      tier: miniApp.tier,
    }))
