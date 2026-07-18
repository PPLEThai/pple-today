import { MiniAppTier } from '@pple-today/database/prisma'

import { ListMiniAppsResponse } from './models'

/**
 * The mini-app fields the tier-aware listing rules read. Kept structural (rather
 * than the full Prisma row) so this module stays pure and unit-testable without
 * the plugin/config graph.
 */
export interface MiniAppForListing {
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
 * The public listing shape returned to the client — derived from the response
 * DTO so the projection below and the schema in `models.ts` cannot drift apart.
 */
export type ListedMiniApp = ListMiniAppsResponse[number]

/**
 * Tier-aware visibility rule for a single mini app.
 *
 * - `LIVE`  — the established role-based rule: visible to everyone when it has
 *   no required roles, otherwise only to users holding one of those roles.
 * - `DRAFT` — visible only to its owner (`ownerSub === userSub`), so a Builder
 *   sees their own draft in their normal list and nobody else does.
 * - `BETA`  — visible only to its owner for now; accepted invitees become
 *   visible in a later change (they are bound to a `userId` at accept time).
 *
 * @param roles   `pple-ad:`-prefixed visible roles resolved from SSO AD.
 * @param userSub The requesting user's PPLE ID `sub`, or `null` when anonymous.
 */
export const isMiniAppVisible = (
  miniApp: Pick<MiniAppForListing, 'tier' | 'ownerSub' | 'miniAppRoles'>,
  roles: string[],
  userSub: string | null
): boolean => {
  switch (miniApp.tier) {
    case MiniAppTier.LIVE:
      return (
        miniApp.miniAppRoles.length === 0 ||
        miniApp.miniAppRoles.some((miniAppRole) => roles.includes(miniAppRole.role))
      )
    case MiniAppTier.DRAFT:
    case MiniAppTier.BETA:
      return userSub !== null && miniApp.ownerSub === userSub
    default:
      return false
  }
}

/**
 * Filter a full mini-app list down to the apps visible to the requesting user
 * and shape them into the public listing DTO. Pure over its inputs so it can be
 * reused across cached requests with different roles/users.
 */
export const selectVisibleMiniApps = (
  miniApps: MiniAppForListing[],
  roles: string[],
  userSub: string | null
): ListedMiniApp[] =>
  miniApps
    .filter((miniApp) => isMiniAppVisible(miniApp, roles, userSub))
    .map((miniApp) => ({
      slug: miniApp.slug,
      name: miniApp.name,
      iconUrl: miniApp.icon,
      order: miniApp.order,
      url: miniApp.clientUrl,
      requiresAuth: miniApp.requiresAuth,
      tier: miniApp.tier,
    }))
