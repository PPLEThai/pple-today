/**
 * The person-keyed บทบาท list from SSO userinfo, and the copy drawn from it.
 *
 * Switching is by `pple_person_id`, not by role string: two approved `delegate`
 * rows share a role and would collapse if the picker were keyed on `role`.
 * Display prefers the SSO `role_label`; the local map is only a fallback for a
 * role that has not been added here yet.
 */

import { z } from 'zod/v4'

import { toRoleLabel, toRoleValue } from './ad-role'

export interface EligiblePerson {
  id: number
  role: string
  roleLabel: string
  supervisorFullName: string | null
  supervisorRoleLabel: string | null
}

export interface ActiveRoleInfo {
  activePersonId: number | null
  activeRole: string | null
  eligiblePersons: EligiblePerson[]
}

/**
 * One picker row: the role name, plus a supervisor line for delegates.
 *
 * Matches pple-sso's signed-in role picker. `role_description` is deliberately
 * not on `EligiblePerson`, so it cannot appear.
 */
export function personRowCopy(person: EligiblePerson): {
  primary: string
  secondary: string | null
} {
  const primary = person.roleLabel.trim() || toRoleLabel(person.role)
  if (toRoleValue(person.role) !== 'delegate' || !person.supervisorFullName) {
    return { primary, secondary: null }
  }

  const secondary = person.supervisorRoleLabel
    ? `${person.supervisorFullName} · ${person.supervisorRoleLabel}`
    : person.supervisorFullName

  return { primary, secondary }
}

/** Compact แอป-page trigger: the current person's `role_label` only. */
export function activePersonLabel(info: ActiveRoleInfo): string | null {
  const person = info.eligiblePersons.find((entry) => entry.id === info.activePersonId)
  if (person) return personRowCopy(person).primary
  if (info.activeRole) return toRoleLabel(info.activeRole)
  return null
}

// Every nested level is nullish because the AD block is omitted for users with
// no active role. Extra fields (`eligibleRoles`, `role_description`) are ignored
// — the picker is filled from `eligiblePersons` only.
const ActiveRoleUserInfoSchema = z.object({
  ad: z
    .object({
      actualPpleUser: z
        .object({
          id: z.number().nullish(),
          role: z.string().nullish(),
        })
        .nullish(),
      eligiblePersons: z
        .array(
          z.object({
            id: z.number(),
            role: z.string(),
            role_label: z.string().nullish(),
            supervisor_full_name: z.string().nullish(),
            supervisor_role_label: z.string().nullish(),
          })
        )
        .nullish(),
    })
    .nullish(),
})

export function activeRoleInfoFromUserInfo(userInfo: unknown): ActiveRoleInfo {
  const parsed = ActiveRoleUserInfoSchema.safeParse(userInfo)
  if (parsed.error) {
    throw parsed.error
  }

  const ad = parsed.data.ad
  return {
    activePersonId: ad?.actualPpleUser?.id ?? null,
    activeRole: ad?.actualPpleUser?.role ?? null,
    eligiblePersons: (ad?.eligiblePersons ?? []).map((entry) => ({
      id: entry.id,
      role: entry.role,
      roleLabel: entry.role_label?.trim() || toRoleLabel(entry.role),
      supervisorFullName: entry.supervisor_full_name ?? null,
      supervisorRoleLabel: entry.supervisor_role_label ?? null,
    })),
  }
}
