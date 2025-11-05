export const ROLES = [
  'pple-ad:tto',
  'pple-ad:candidate',
  'pple-ad:foundation',
  'pple-ad:hq',
  'pple-ad:local',
  'pple-ad:mp',
  'pple-ad:mp_assistant',
  'pple-ad:province',
  'pple-member:membership_permanant',
  'pple-member:membership_yearly',
  'official',
] as const

export const getRoleName = (role: (typeof ROLES)[number] | string) => {
  switch (role) {
    case 'pple-ad:tto':
      return 'ตทอ.'
    case 'pple-ad:candidate':
      return 'แคนดิเดต สส.'
    case 'pple-ad:foundation':
      return 'มูลนิธิ'
    case 'pple-ad:hq':
      return 'ส่วนกลาง'
    case 'pple-ad:local':
      return 'ทีมท้องถิ่น'
    case 'pple-ad:mp':
      return 'สส.'
    case 'pple-ad:mp_assistant':
    case 'pple-ad:mpassistant':
      return 'ผู้ช่วย สส.'
    case 'pple-ad:province':
      return 'ทีมจังหวัด'
    case 'pple-member:membership_permanant':
      return 'สมาชิกตลอดชีพ'
    case 'pple-member:membership_yearly':
      return 'สมาชิกรายปี'
    case 'official':
      return 'Official'
  }
  return 'ประชาชน'
}
