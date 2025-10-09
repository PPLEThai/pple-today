export const getRoleName = (roles: string[]) => {
  for (const role of roles) {
    switch (role) {
      case 'pple-ad:mp':
        return 'สส.'
      case 'pple-ad:hq':
        return 'ส่วนกลาง'
      case 'pple-ad:province':
        return 'ทีมจังหวัด'
      case 'pple-ad:foundation':
        return 'มูลนิธิ'
      case 'pple-ad:local':
        return 'ทีมท้องถิ่น'
      case 'pple-ad:mpassistant':
        return 'ผู้ช่วย สส.'
      case 'pple-ad:tto':
        return 'ตทอ.'
      case 'official':
        return 'Official'
    }
  }

  return 'ประชาชน'
}
