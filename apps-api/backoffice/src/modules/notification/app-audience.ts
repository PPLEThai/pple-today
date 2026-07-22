import { MiniAppTier } from '@pple-today/database/prisma'

/**
 * Everything the audience rule needs about one mini app and the people around
 * it. Structural rather than a Prisma row so this module stays pure and
 * unit-testable without the plugin/config graph.
 */
export interface AppNotificationAudienceInput {
  tier: MiniAppTier
  /** The Builder's PPLE ID `sub`, or null for a central-team app. */
  ownerSub: string | null
  /** Everyone who has opened the app — the App User registry. */
  appUserIds: string[]
  /** App users holding an ACCEPTED invite, resolved by user id. */
  acceptedInviteUserIds: ReadonlySet<string>
}

/**
 * Audience input plus the app facts the send path needs for self-links
 * (`slug` → mini-app redirect entry). Loaded in the same round trip.
 */
export type AppNotificationSendContext = AppNotificationAudienceInput & {
  slug: string
}

/**
 * Resolve who an app-bound notification may reach: this app's App Users,
 * narrowed to those still inside its current publication tier's audience.
 *
 * Two rules combine, and the order matters:
 *
 * 1. **The App User registry is the outer bound, always.** Only people who have
 *    actually opened the app can be reached — being merely *able* to see it, or
 *    having accepted an invite, is not enough. Opening the app is the consent
 *    boundary the whole notification model rests on.
 * 2. **The tier narrows that set further, live at send time.** Nothing is
 *    materialised per tier, so a tier change (or a revoked invite) takes effect
 *    on the very next send.
 *
 * Tier by tier:
 *
 * - `DRAFT` — the owner alone. A draft is private to its Builder.
 * - `BETA`  — the owner plus testers holding an ACCEPTED invite. Withdrawing or
 *   declining an invite removes the tester immediately, even though they remain
 *   in the App User registry (that history is kept for audit and the user count).
 * - `LIVE`  — every App User.
 *
 * ## Why LIVE does not re-apply role visibility
 *
 * `MiniAppRole` gates *listing* by `pple-ad:` roles, and those roles are
 * resolved live from SSO AD against the caller's own bearer token
 * (`AuthGuard.getAdVisibleRoles`) — they are not stored in `UserRole`, which
 * holds OIDC token roles. A send has no user token, so there is nothing here to
 * re-check a role against, and doing it per recipient would mean an SSO call per
 * App User on every send.
 *
 * That is sound rather than merely pragmatic: to become an App User of a Live
 * app, a person had to see it listed and open it, which *is* the role check,
 * applied at open time with their own token. The registry records the outcome.
 * The residue is that someone who loses a role keeps receiving that app's
 * notifications until the Builder's audience is pruned — worth revisiting if
 * role churn ever matters more than send-path simplicity.
 */
export const resolveAppAudience = (input: AppNotificationAudienceInput): string[] => {
  const appUserIds = Array.from(new Set(input.appUserIds))

  switch (input.tier) {
    case MiniAppTier.DRAFT:
      return appUserIds.filter((userId) => userId === input.ownerSub)
    case MiniAppTier.BETA:
      return appUserIds.filter(
        (userId) => userId === input.ownerSub || input.acceptedInviteUserIds.has(userId)
      )
    case MiniAppTier.LIVE:
      return appUserIds
    default:
      // An unknown tier reaches nobody: the audience rule fails closed, matching
      // the eligibility rules' default in the listing path.
      return []
  }
}
