/**
 * บทบาท (AD role) naming, in one place.
 *
 * The same role travels under three spellings: the API prefixes it
 * (`pple-ad:mp`), the SSO userinfo returns it bare (`mp`) — and, inconsistently,
 * sometimes returns the Thai label instead. Everything user-facing has to agree
 * on one canonical value, because that value is also what the switch-role
 * endpoint is given; sending the wrong spelling switches nothing.
 */

/** How the API qualifies AD roles (mini-app role lists, `/auth/me`). */
export const AD_ROLE_PREFIX = 'pple-ad:'

const ROLE_LABELS: Record<string, string> = {
  local: 'ทีมท้องถิ่น',
  province: 'ทีมจังหวัด',
  tto: 'ตทอ.',
  hq: 'ส่วนกลาง',
  foundation: 'มูลนิธิ',
  mp: 'สส.',
  candidate: 'ผู้สมัคร',
  confirmed_candidate: 'ผู้สมัคร (ยืนยัน)',
  delegate: 'ปฎิบัติงานแทน',
}

const ROLE_VALUE_BY_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_LABELS).map(([value, label]) => [label, value])
)

/**
 * The canonical role value, from any of the three spellings. Unknown roles pass
 * through unchanged (minus the prefix) so a role added in SSO before it is added
 * here still switches correctly — it just shows its raw name.
 */
export const toRoleValue = (role: string) => {
  const bare = role.startsWith(AD_ROLE_PREFIX) ? role.slice(AD_ROLE_PREFIX.length) : role

  return ROLE_VALUE_BY_LABEL[bare] ?? bare
}

/** The Thai label to show for a role, from any of the three spellings. */
export const toRoleLabel = (role: string) => ROLE_LABELS[toRoleValue(role)] ?? role
