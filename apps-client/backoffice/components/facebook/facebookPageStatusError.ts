/**
 * What to tell an admin when changing a Facebook page's status fails. Approving
 * subscribes the page on Facebook with the token the page manager linked, so
 * some failures can only be fixed by the manager reconnecting in the app.
 */
export function facebookPageStatusErrorAlert(code: string | undefined) {
  switch (code) {
    case 'FACEBOOK_INSUFFICIENT_PERMISSION':
      return {
        title: 'สิทธิ์ Facebook ของเพจไม่เพียงพอ',
        description:
          'ผู้ดูแลเพจไม่ได้อนุญาตสิทธิ์ที่จำเป็นสำหรับเพจนี้ กรุณาแจ้งให้ผู้ดูแลเพจลบเพจออกจากแอป PPLE Today แล้วเชื่อมต่อใหม่ โดยเลือกเพจนี้และอนุญาตสิทธิ์ทั้งหมดที่ขอ',
      }
    case 'FACEBOOK_INVALID_ACCESS_TOKEN':
      return {
        title: 'การเชื่อมต่อ Facebook ของเพจหมดอายุ',
        description:
          'สิทธิ์เข้าถึงเพจนี้ใช้ไม่ได้แล้ว กรุณาแจ้งให้ผู้ดูแลเพจลบเพจออกจากแอป PPLE Today แล้วเชื่อมต่อใหม่',
      }
    case 'FACEBOOK_PAGE_AUTHOR_NOT_FOUND':
      return {
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่พบผู้ดูแลเพจที่เชื่อมต่อเพจนี้',
      }
    default:
      return {
        title: 'เกิดข้อผิดพลาด',
        description: 'ไม่สามารถแก้ไขสถานะเพจได้ กรุณาลองใหม่อีกครั้ง',
      }
  }
}
