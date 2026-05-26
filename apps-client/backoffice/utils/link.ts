import { inAppNavigationRequiresId } from '@pple-today/api-common/utils'

import { BannerInAppType } from '@api/backoffice/admin'

import { exhaustiveGuard } from '~/libs/exhaustive-guard'

export { inAppNavigationRequiresId }

export function createLinkFromInAppNavigation(inAppType: BannerInAppType, inAppId: string) {
  switch (inAppType) {
    case 'ANNOUNCEMENT':
      return `/feed/announcement/${inAppId}`
    case 'ELECTION':
      return `/activity/internal-election/${inAppId}`
    case 'ELECTION_VOTE':
      return `/activity/internal-election/${inAppId}`
    case 'HASHTAG':
      return `/feed/hashtag?search=${inAppId}`
    case 'POLL':
      return `/activity/poll/${inAppId}`
    case 'POST':
      return `/feed/post/${inAppId}`
    case 'TOPIC':
      return `/feed/topic/${inAppId}`
    case 'USER':
      return `/user/${inAppId}`
    case 'OFFICIAL':
      return '/feed/banner'
    case 'ACTIVITY':
      return '/activity'
    case 'ANNOUNCEMENT_LIST':
      return '/feed/announcement'
    case 'NOTIFICATION_LIST':
      return '/feed/banner'
    case 'SEARCH':
      return '/feed'
    case 'PROFILE':
      return '/user'
    case 'MY_ACTIVITIES':
      return '/activity'
    case 'RECENT_ACTIVITIES':
      return '/activity'
    case 'FOLLOW':
      return '/user'
    case 'PARTICIPATION':
      return '/user'
    case 'TOPIC_SUGGESTION':
      return '/feed/topic'
    case 'USER_SUGGESTION':
      return '/user'
    default:
      exhaustiveGuard(inAppType)
  }
}

export function mapInAppNavigationTypeToLabel(inAppType: BannerInAppType) {
  switch (inAppType) {
    case 'ANNOUNCEMENT':
      return 'ประกาศ'
    case 'ELECTION':
      return 'การเลือกตั้ง'
    case 'ELECTION_VOTE':
      return 'หน้าโหวตการเลือกตั้ง'
    case 'HASHTAG':
      return 'แฮชแท็ก'
    case 'POLL':
      return 'โพล'
    case 'POST':
      return 'โพสต์'
    case 'TOPIC':
      return 'หัวข้อ'
    case 'USER':
      return 'ผู้ใช้'
    case 'OFFICIAL':
      return 'หน้าแอปฯ (รายการมินิแอป)'
    case 'ACTIVITY':
      return 'หน้ากิจกรรม'
    case 'ANNOUNCEMENT_LIST':
      return 'รายการประกาศ'
    case 'NOTIFICATION_LIST':
      return 'รายการแจ้งเตือน'
    case 'SEARCH':
      return 'หน้าค้นหา'
    case 'PROFILE':
      return 'หน้าโปรไฟล์'
    case 'MY_ACTIVITIES':
      return 'กิจกรรมของฉัน'
    case 'RECENT_ACTIVITIES':
      return 'กิจกรรมล่าสุด'
    case 'FOLLOW':
      return 'รายการติดตาม'
    case 'PARTICIPATION':
      return 'การมีส่วนร่วม'
    case 'TOPIC_SUGGESTION':
      return 'แนะนำหัวข้อ'
    case 'USER_SUGGESTION':
      return 'แนะนำผู้ใช้'
    default:
      exhaustiveGuard(inAppType)
  }
}
