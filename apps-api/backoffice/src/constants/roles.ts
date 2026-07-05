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
