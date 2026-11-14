type StatusUpdateError = {
  value?: { error?: { code?: string; message?: string } }
}

const STATUS_LABEL = {
  APPROVED: 'อนุมัติ',
  REJECTED: 'ไม่อนุมัติ',
  SUSPENDED: 'ระงับ',
  PENDING: 'รอตรวจสอบ',
  UNLINKED: 'ยกเลิกการเชื่อมต่อ',
} as const

/** Builds the alert shown when changing a Facebook page's status fails. */
export const facebookPageStatusErrorAlert = (
  status: keyof typeof STATUS_LABEL,
  error: StatusUpdateError
) => {
  const code = error.value?.error?.code
  const message = error.value?.error?.message

  let description = `ไม่สามารถ${STATUS_LABEL[status]}เพจได้`

  if (code === 'FACEBOOK_INSUFFICIENT_PERMISSION') {
    description +=
      ' เนื่องจากผู้ดูแลเพจไม่ได้อนุญาตสิทธิ์ที่จำเป็นสำหรับเพจนี้ กรุณาให้ผู้ดูแลเพจลบเพจออกจากแอป PPLE Today แล้วเชื่อมต่อใหม่ โดยเลือกเพจนี้และอนุญาตสิทธิ์ทั้งหมดที่ขอ'
  } else if (code === 'FACEBOOK_INVALID_ACCESS_TOKEN') {
    description +=
      ' เนื่องจากสิทธิ์เข้าถึงเพจนี้ใช้ไม่ได้แล้ว กรุณาให้ผู้ดูแลเพจลบเพจออกจากแอป PPLE Today แล้วเชื่อมต่อใหม่'
  } else if (code === 'FACEBOOK_API_ERROR' && message?.includes('pages_manage_metadata')) {
    description +=
      ' เนื่องจากเพจไม่ได้ให้สิทธิ์ pages_manage_metadata กรุณาให้ผู้ดูแลเพจเชื่อมต่อเพจใหม่และอนุญาตสิทธิ์ทั้งหมด'
  } else if (code === 'FACEBOOK_PAGE_AUTHOR_NOT_FOUND') {
    description += ' เนื่องจากไม่พบผู้ดูแลเพจ'
  }

  if (message) description += `\n\n${code ? `${code}: ` : ''}${message}`

  return { title: 'เกิดข้อผิดพลาด', description }
}
