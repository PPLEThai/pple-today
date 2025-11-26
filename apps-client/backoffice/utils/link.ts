import { BannerInAppType } from '@api/backoffice/admin'

import { exhaustiveGuard } from '~/libs/exhaustive-guard'

export function createLinkFromInAppNavigation(inAppType: BannerInAppType, inAppId: string) {
  switch (inAppType) {
    case 'ANNOUNCEMENT':
      return `/feed/announcement/${inAppId}`
    case 'ELECTION':
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
    default:
      exhaustiveGuard(inAppType)
  }
}
