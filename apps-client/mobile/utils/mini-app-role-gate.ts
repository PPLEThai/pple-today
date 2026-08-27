/**
 * Opening a mini app your active role is not listed for.
 *
 * The role list on a published app is a *listing* filter — it decides whose app
 * grid shows the app, not who is allowed in — and every mini app authorises its
 * own routes regardless. So following a link to an app outside your role is not
 * an error to report; it is a question to ask: switch บทบาท first, or go in as
 * you are. This module holds the two decisions behind that prompt, apart from
 * the component that draws it.
 */

import type { EligiblePerson } from './active-role'
import { toRoleValue } from './ad-role'

/** What the prompt needs to know about the app that turned the caller away. */
export interface MiniAppRoleMismatch {
  appName: string
  /** Canonical role values the app is listed for (prefix already stripped). */
  requiredRoles: string[]
}

/**
 * The role-mismatch details inside a rejected token exchange, or `null` for
 * every other failure.
 *
 * Anything else — a missing app, an expired session, no signal at all — stays a
 * plain error, so the unwrapping is deliberately narrow: only the one code the
 * API raises for this case, and only when it carries the app's name.
 */
export function roleMismatchFromError(error: unknown): MiniAppRoleMismatch | null {
  const body = (
    error as {
      value?: { error?: { code?: unknown; data?: { appName?: unknown; requiredRoles?: unknown } } }
    } | null
  )?.value?.error

  if (body?.code !== 'MINI_APP_ROLE_NOT_ELIGIBLE') return null
  if (typeof body.data?.appName !== 'string') return null

  const requiredRoles = Array.isArray(body.data.requiredRoles)
    ? body.data.requiredRoles.filter((role): role is string => typeof role === 'string')
    : []

  return {
    appName: body.data.appName,
    requiredRoles: requiredRoles.map(toRoleValue),
  }
}

/**
 * Which person the prompt should start on.
 *
 * A person whose role actually gets them in beats the one they are already
 * wearing: the prompt exists because the active person is not listed, so
 * preselect the first eligible person who is. Failing that, leave them on their
 * current person — they can still choose to enter as they are.
 *
 * Compared by `id`, not by role string: two `delegate` rows must stay two
 * options even though `role` is the same.
 */
export function preferredPersonForApp({
  eligiblePersons,
  requiredRoles,
  activePersonId,
}: {
  eligiblePersons: EligiblePerson[]
  requiredRoles: string[]
  activePersonId: number | null
}): number | null {
  const requiredValues = new Set(requiredRoles.map(toRoleValue))

  const fitting = eligiblePersons.find((entry) => requiredValues.has(toRoleValue(entry.role)))
  if (fitting) return fitting.id

  if (activePersonId != null) return activePersonId

  return eligiblePersons[0]?.id ?? null
}
