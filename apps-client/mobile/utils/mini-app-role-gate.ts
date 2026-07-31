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
 * Which บทบาท the dropdown should start on.
 *
 * A role that actually gets the person in beats the one they are already
 * wearing: the prompt exists because the active role does not fit, so preselect
 * the first eligible role that does. Failing that, leave them on their active
 * role — they can still choose to enter as they are.
 */
export function preferredRoleForApp({
  eligibleRoles,
  requiredRoles,
  activeRole,
}: {
  eligibleRoles: string[]
  requiredRoles: string[]
  activeRole: string | null
}): string | null {
  const eligibleValues = eligibleRoles.map(toRoleValue)
  const requiredValues = new Set(requiredRoles.map(toRoleValue))

  const fitting = eligibleValues.find((role) => requiredValues.has(role))
  if (fitting) return fitting

  const activeValue = activeRole ? toRoleValue(activeRole) : null
  if (activeValue && eligibleValues.includes(activeValue)) return activeValue

  return activeValue ?? eligibleValues[0] ?? null
}
