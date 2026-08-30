/** Prefix applied to SSO AD role keys to form PPLE Today config roles. */
export const AD_ROLE_PREFIX = 'pple-ad:'

export const ALLOWED_ROLES = [
  'pple-ad:tto',
  'pple-ad:candidate',
  'pple-ad:foundation',
  'pple-ad:hq',
  'pple-ad:local',
  'pple-ad:mp',
  'pple-ad:mp_assistant',
  'pple-ad:province',
]

/**
 * Thai labels for the SSO AD main roles (`ad.user.role`), keyed by the raw
 * role value (without the `pple-ad:` prefix). Extra-role labels come from the
 * AD role options API (`AD_ROLE_OPTIONS_URL`) instead.
 */
export const MAIN_AD_ROLE_LABELS: Record<string, string> = {
  mp: 'ส.ส.',
  local: 'ทีมท้องถิ่น',
  tto: 'ตทอ.',
  province: 'ทีมจังหวัด',
  hq: 'ส่วนกลาง',
  foundation: 'มูลนิธิ',
  candidate: 'ผู้สมัคร',
  confirmed_candidate: 'ผู้สมัคร (ยืนยัน)',
  delegate: 'ปฎิบัติงานแทน',
}

/**
 * Roles allowed to connect and manage a Facebook page in PPLE Today.
 *
 * Enforced by the `/facebook` route guards and served to clients through
 * `GET /facebook/config`, so changing who may connect a page is a backend
 * change only — shipped apps pick it up without a release.
 */
export const FACEBOOK_CONNECT_ALLOWED_ROLES = [
  'pple-ad:mp',
  'pple-ad:hq',
  'pple-ad:ppleToday:allowFB',
]

/**
 * The AD role that grants access to the PPLE Today CMS (every `/admin/*` route).
 *
 * Replaces the Zitadel `today-cms:admin` role: admin access now follows the AD
 * active role like every other authorisation decision, so granting or revoking
 * it is an AD change rather than a Zitadel one.
 */
export const CMS_ADMIN_ROLE = 'pple-ad:ppleToday:admin'

/**
 * Whether the caller may use the CMS, from the visible roles resolved for their
 * active role. Takes AD roles only: the retired Zitadel `today-cms:admin` does
 * not admit, because a Zitadel role does not follow a role switch.
 */
export const isCmsAdmin = (visibleRoles: string[]) => visibleRoles.includes(CMS_ADMIN_ROLE)
