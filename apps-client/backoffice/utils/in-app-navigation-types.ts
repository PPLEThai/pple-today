/** Values for banner / notification in-app navigation selects (kept in sync with Prisma enums). */
export const BANNER_IN_APP_TYPE_VALUES = [
  'POST',
  'POLL',
  'TOPIC',
  'USER',
  'ANNOUNCEMENT',
  'ELECTION',
  'ELECTION_VOTE',
  'HASHTAG',
  'OFFICIAL',
  'ACTIVITY',
  'ANNOUNCEMENT_LIST',
  'NOTIFICATION_LIST',
  'SEARCH',
  'PROFILE',
  'MY_ACTIVITIES',
  'RECENT_ACTIVITIES',
  'FOLLOW',
  'PARTICIPATION',
  'TOPIC_SUGGESTION',
  'USER_SUGGESTION',
] as const

export type BannerInAppTypeFormValue = (typeof BANNER_IN_APP_TYPE_VALUES)[number]

/** Tab/list screens — no entity ID required for in-app navigation. */
export const IN_APP_NAVIGATION_TYPES_WITHOUT_ID = [
  'OFFICIAL',
  'ACTIVITY',
  'ANNOUNCEMENT_LIST',
  'NOTIFICATION_LIST',
  'SEARCH',
  'PROFILE',
  'MY_ACTIVITIES',
  'RECENT_ACTIVITIES',
  'FOLLOW',
  'PARTICIPATION',
  'TOPIC_SUGGESTION',
  'USER_SUGGESTION',
] as const satisfies readonly BannerInAppTypeFormValue[]

export function inAppNavigationRequiresId(inAppType: string): boolean {
  return !(IN_APP_NAVIGATION_TYPES_WITHOUT_ID as readonly string[]).includes(inAppType)
}
