import { BannerInAppType } from '@pple-today/database/prisma'

/** Tab/list screens — no entity lookup; `inAppId` may be empty. */
export const IN_APP_NAVIGATION_TYPES_WITHOUT_ID = [
  BannerInAppType.OFFICIAL,
  BannerInAppType.ACTIVITY,
  BannerInAppType.ANNOUNCEMENT_LIST,
  BannerInAppType.NOTIFICATION_LIST,
  BannerInAppType.SEARCH,
  BannerInAppType.PROFILE,
  BannerInAppType.MY_ACTIVITIES,
  BannerInAppType.RECENT_ACTIVITIES,
  BannerInAppType.FOLLOW,
  BannerInAppType.PARTICIPATION,
  BannerInAppType.TOPIC_SUGGESTION,
  BannerInAppType.USER_SUGGESTION,
] as const satisfies readonly BannerInAppType[]

export function inAppNavigationRequiresId(inAppType: BannerInAppType): boolean {
  return !(IN_APP_NAVIGATION_TYPES_WITHOUT_ID as readonly BannerInAppType[]).includes(inAppType)
}
