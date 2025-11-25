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
