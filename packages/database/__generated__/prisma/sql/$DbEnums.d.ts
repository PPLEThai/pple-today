export interface $DbEnums {}


export namespace $DbEnums {
  type AnnouncementType = "OFFICIAL" | "PARTY_COMMUNICATE" | "INTERNAL"
  type AnnouncementStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"
  type AuditLogAction = "CREATE" | "UPDATE" | "DELETE"
  type EntityType = "POST" | "POLL" | "ANNOUNCEMENT" | "HASHTAG" | "TOPIC" | "BANNER" | "ELECTION" | "FACEBOOK_PAGE" | "USER"
  type BannerStatusType = "DRAFT" | "PUBLISHED" | "ARCHIVED"
  type BannerNavigationType = "IN_APP_NAVIGATION" | "EXTERNAL_BROWSER" | "MINI_APP"
  type ElectionType = "ONSITE" | "ONLINE" | "HYBRID"
  type EligibleVoterType = "ONSITE" | "ONLINE"
  type ElectionResultType = "ONSITE" | "ONLINE"
  type ElectionMode = "SECURE" | "FLEXIBLE"
  type FeedItemType = "POST" | "POLL" | "ANNOUNCEMENT"
  type FeedItemReactionType = "UP_VOTE" | "DOWN_VOTE"
  type FacebookPageLinkedStatus = "PENDING" | "UNLINKED" | "APPROVED" | "REJECTED"
  type PollType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE"
  type PollStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"
  type PostAttachmentType = "IMAGE" | "VIDEO"
  type PostStatus = "PUBLISHED" | "HIDDEN" | "DELETED"
  type HashTagStatus = "PUBLISHED" | "SUSPENDED"
  type TopicStatus = "PUBLISHED" | "SUSPENDED"
  type UserStatus = "ACTIVE" | "SUSPENDED"
}
