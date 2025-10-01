export interface $DbEnums {}


export namespace $DbEnums {
  type AnnouncementType = "OFFICIAL" | "PARTY_COMMUNICATE" | "INTERNAL"
  type AuditLogAction = "CREATE" | "UPDATE" | "DELETE"
  type EntityType = "POST" | "POLL" | "ANNOUNCEMENT" | "HASHTAG" | "TOPIC" | "BANNER" | "ELECTION" | "FACEBOOK_PAGE" | "USER"
  type BannerStatusType = "PUBLISH" | "DRAFT"
  type BannerNavigationType = "IN_APP_NAVIGATION" | "EXTERNAL_BROWSER" | "MINI_APP"
  type ElectionType = "ONSITE" | "ONLINE" | "HYBRID"
  type EligibleVoterType = "ONSITE" | "ONLINE"
  type ElectionResultType = "ONSITE" | "ONLINE"
  type ElectionMode = "SECURE" | "FLEXIBLE"
  type FeedItemType = "POST" | "POLL" | "ANNOUNCEMENT"
  type FeedItemReactionType = "UP_VOTE" | "DOWN_VOTE"
  type PollType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE"
  type PostAttachmentType = "IMAGE" | "VIDEO" | "AUDIO"
  type HashTagStatus = "PUBLISH" | "SUSPEND"
  type TopicStatus = "PUBLISH" | "DRAFT"
}
