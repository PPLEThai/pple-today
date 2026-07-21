import { BannerInAppType } from '@api/backoffice/app'

import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

export function getMobilePathFromInAppNavigation(
  inAppType: BannerInAppType | 'NOTIFICATION' | 'MINI_APP_INVITE',
  inAppId: string
) {
  switch (inAppType) {
    // A Beta invite has no entity to open; a tap lands on the แอป tab, where the
    // accept/decline inbox is rendered.
    case 'MINI_APP_INVITE':
      return '/official' as const
    case 'ELECTION':
      return `/election/${inAppId}` as const
    case 'ELECTION_VOTE':
      return `/election/${inAppId}/vote` as const
    case 'HASHTAG':
      return `/hashtag/${inAppId}` as const
    case 'ANNOUNCEMENT':
      return `/announcement/${inAppId}` as const
    case 'POLL':
    case 'POST':
      return `/feed/${inAppId}` as const
    case 'TOPIC':
      return `/topic/${inAppId}` as const
    case 'USER':
      return `/user/${inAppId}` as const
    case 'NOTIFICATION':
      return `/notification/${inAppId}` as const
    case 'OFFICIAL':
      return '/official' as const
    case 'ACTIVITY':
      return '/activity' as const
    case 'ANNOUNCEMENT_LIST':
      return '/announcement' as const
    case 'NOTIFICATION_LIST':
      return '/notification' as const
    case 'SEARCH':
      return '/search' as const
    case 'PROFILE':
      return '/profile' as const
    case 'MY_ACTIVITIES':
      return '/my-activities' as const
    case 'RECENT_ACTIVITIES':
      return '/recent-activities' as const
    case 'FOLLOW':
      return '/follow' as const
    case 'PARTICIPATION':
      return '/participation' as const
    case 'TOPIC_SUGGESTION':
      return '/topic/suggestion' as const
    case 'USER_SUGGESTION':
      return '/user-suggestion' as const
    default:
      exhaustiveGuard(inAppType)
  }
}
