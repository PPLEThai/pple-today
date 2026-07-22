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
  /**
   * The app's Collaborators (PPLE ID `sub`s), synced from the platform. A
   * Collaborator is a builder alongside the Owner, so a Draft/Beta app lists for
   * them too — matching the web membership door, which admits Collaborators.
   */
  collaboratorSubs: string[]
  /** A LIVE app listed to no one but still reachable by its link. */
  unlisted: boolean
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

// NOTE: a new `MiniAppTier` case must be handled in three places that switch on
// tier — `isMiniAppListable` and `isMiniAppAccessible` here, and
// `resolveAppAudience` in `../notification/app-audience.ts`. They are kept
// separate on purpose (listing vs access vs notification audience are different
// questions); this note is the cross-link between them.

/** The subset of mini-app facts the eligibility predicates actually read. */
type EligibilityMiniApp = Pick<
  MiniAppForListing,
  'id' | 'tier' | 'ownerSub' | 'collaboratorSubs' | 'unlisted' | 'miniAppRoles'
>

/**
 * A *builder* of the app: its Owner or one of its Collaborators. Both are the
 * app's makers, so Draft and Beta apps admit either. Collaborators come from the
 * platform database (which owns them) synced onto the row; the Owner is
 * `ownerSub`. Anonymous callers are never builders.
 */
const isBuilder = (miniApp: EligibilityMiniApp, viewer: MiniAppViewer): boolean =>
  viewer.sub !== null &&
  (miniApp.ownerSub === viewer.sub || miniApp.collaboratorSubs.includes(viewer.sub))

/**
 * The established LIVE role rule: an app with no required roles is for everyone,
 * otherwise only for users holding one of those roles. An invite grants nothing
 * here; Live role eligibility is roles only.
 */
const hasVisibilityRole = (miniApp: EligibilityMiniApp, viewer: MiniAppViewer): boolean =>
  miniApp.miniAppRoles.length === 0 ||
  miniApp.miniAppRoles.some((miniAppRole) => viewer.roles.includes(miniAppRole.role))

/** BETA membership: a builder, or a tester holding an ACCEPTED invite. */
const isBetaMember = (miniApp: EligibilityMiniApp, viewer: MiniAppViewer): boolean =>
  isBuilder(miniApp, viewer) ||
  (viewer.sub !== null && viewer.acceptedInviteMiniAppIds.has(miniApp.id))

/**
 * Whether a mini app appears in the caller's PPLE Today list. Listing is
 * *discovery* — it governs who sees the app, not who may open it.
 *
 * - `LIVE`  — the role rule, unless the app is `unlisted`: an unlisted Live app
 *   is listed to no one (it is reached by its link, never discovered).
 * - `DRAFT` — its builders (Owner or a Collaborator), so a Builder and the
 *   people building alongside them see their draft and nobody else does.
 * - `BETA`  — its builders, or a tester holding an ACCEPTED invite bound to
 *   their account. A pending or declined invite lists nothing.
 */
export const isMiniAppListable = (miniApp: EligibilityMiniApp, viewer: MiniAppViewer): boolean => {
  switch (miniApp.tier) {
    case MiniAppTier.LIVE:
      return !miniApp.unlisted && hasVisibilityRole(miniApp, viewer)
    case MiniAppTier.DRAFT:
      return isBuilder(miniApp, viewer)
    case MiniAppTier.BETA:
      return isBetaMember(miniApp, viewer)
    default:
      return false
  }
}

/**
 * Whether the caller may open the app — token exchange / first-open. Access is
 * distinct from listing: an `unlisted` Live app is not listed to anyone yet is
 * reachable by any authenticated member who has its link.
 *
 * - `LIVE`  — `unlisted` ⇒ any authenticated member (reachable by link);
 *   otherwise the same role rule as listing.
 * - `DRAFT` — its builders only.
 * - `BETA`  — its builders, or an ACCEPTED invitee.
 */
export const isMiniAppAccessible = (
  miniApp: EligibilityMiniApp,
  viewer: MiniAppViewer
): boolean => {
  switch (miniApp.tier) {
    case MiniAppTier.LIVE:
      return miniApp.unlisted ? viewer.sub !== null : hasVisibilityRole(miniApp, viewer)
    case MiniAppTier.DRAFT:
      return isBuilder(miniApp, viewer)
    case MiniAppTier.BETA:
      return isBetaMember(miniApp, viewer)
    default:
      return false
  }
}

/**
 * Filter a full mini-app list down to the apps *listable* to the requesting user
 * and shape them into the public listing DTO. Pure over its inputs so it can be
 * reused across cached requests with different viewers.
 */
export const selectVisibleMiniApps = (
  miniApps: MiniAppForListing[],
  viewer: MiniAppViewer
): ListedMiniApp[] =>
  miniApps
    .filter((miniApp) => isMiniAppListable(miniApp, viewer))
    .map((miniApp) => ({
      slug: miniApp.slug,
      name: miniApp.name,
      iconUrl: miniApp.icon,
      order: miniApp.order,
      url: miniApp.clientUrl,
      requiresAuth: miniApp.requiresAuth,
      tier: miniApp.tier,
    }))
