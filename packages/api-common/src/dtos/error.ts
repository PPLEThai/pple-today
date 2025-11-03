import { TAnySchema } from '@sinclair/typebox'
import { InvertedStatusMap } from 'elysia'

export type InternalErrorSchema = {
  status: keyof InvertedStatusMap
  data?: TAnySchema
}
export type InternalErrorSchemas = Record<string, null | InternalErrorSchema>

const COMMON_ERROR_SCHEMA = {
  BAD_REQUEST: {
    status: 400,
  },
  UNAUTHORIZED: {
    status: 401,
  },
  FORBIDDEN: {
    status: 403,
  },
  NOT_FOUND: {
    status: 404,
  },
  VALIDATION_ERROR: {
    status: 422,
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
  },
  NOT_IMPLEMENTED: {
    status: 501,
  },
} satisfies InternalErrorSchemas

const FILE_ERROR_SCHEMA = {
  FILE_UPLOAD_ERROR: {
    status: 500,
  },
  FILE_DELETE_ERROR: {
    status: 500,
  },
  FILE_CREATE_SIGNED_URL_ERROR: {
    status: 500,
  },
  FILE_MOVE_ERROR: {
    status: 500,
  },
  FILE_UNSUPPORTED_MIME_TYPE: {
    status: 400,
  },
  FILE_CHANGE_PERMISSION_ERROR: {
    status: 500,
  },
  FILE_ROLLBACK_FAILED: {
    status: 500,
  },
} satisfies InternalErrorSchemas

const AUTH_ERROR_SCHEMA = {
  AUTH_USER_NOT_FOUND: {
    status: 401,
  },
  AUTH_USER_ALREADY_EXISTS: {
    status: 409,
  },
} satisfies InternalErrorSchemas

const ANNOUNCEMENT_ERROR_SCHEMA = {
  ANNOUNCEMENT_NOT_FOUND: {
    status: 404,
  },
  ANNOUNCEMENT_INVALID_DRAFT: {
    status: 400,
  },
} satisfies InternalErrorSchemas

export const BANNER_ERROR_SCHEMA = {
  BANNER_NOT_FOUND: {
    status: 404,
  },
  BANNER_INVALID_INPUT: {
    status: 400,
  },
} satisfies InternalErrorSchemas

const FEED_ERROR_SCHEMA = {
  FEED_ITEM_NOT_FOUND: {
    status: 404,
  },
  FEED_ITEM_COMMENT_NOT_FOUND: {
    status: 404,
  },
  FEED_ITEM_REACTION_NOT_FOUND: {
    status: 404,
  },
  FEED_ITEM_REACTION_ALREADY_EXISTS: {
    status: 409,
  },
  FEED_ITEM_ALREADY_EXISTED: {
    status: 409,
  },
} satisfies InternalErrorSchemas

const ABOUT_US_ERROR_SCHEMA = {
  ABOUT_US_NOT_FOUND: {
    status: 404,
  },
} satisfies InternalErrorSchemas

const USER_ERROR_SCHEMA = {
  USER_FOLLOWING_TOPIC_NOT_FOUND: {
    status: 422,
  },
  USER_ALREADY_DONE_ONBOARDING: {
    status: 409,
  },
  USER_INVALID_INPUT: {
    status: 400,
  },
  USER_NOT_FOUND: {
    status: 404,
  },
  USER_ALREADY_FOLLOWS: {
    status: 409,
  },
  USER_NOT_FOLLOWS: {
    status: 404,
  },
} satisfies InternalErrorSchemas

const FACEBOOK_ERROR_SCHEMA = {
  FACEBOOK_INVALID_RESPONSE: {
    status: 400,
  },
  FACEBOOK_INVALID_ACCESS_TOKEN: {
    status: 401,
  },
  FACEBOOK_API_ERROR: {
    status: 500,
  },
  FACEBOOK_PAGE_ALREADY_LINKED: {
    status: 409,
  },
  FACEBOOK_LINKED_PAGE_NOT_FOUND: {
    status: 404,
  },
  FACEBOOK_WEBHOOK_VERIFICATION_FAILED: {
    status: 400,
  },
  FACEBOOK_WEBHOOK_INVALID_SIGNATURE: {
    status: 400,
  },
  FACEBOOK_WEBHOOK_NOT_SUPPORTED: {
    status: 501,
  },
} satisfies InternalErrorSchemas

const POLL_ERROR_SCHEMA = {
  POLL_NOT_FOUND: {
    status: 404,
  },
  POLL_ALREADY_VOTED: {
    status: 409,
  },
  POLL_OPTION_NOT_FOUND: {
    status: 404,
  },
  POLL_VOTE_NOT_FOUND: {
    status: 404,
  },
  POLL_ALREADY_ENDED: {
    status: 403,
  },
} satisfies InternalErrorSchemas

const HASHTAG_ERROR_SCHEMA = {
  HASHTAG_NOT_FOUND: {
    status: 404,
  },
  HASHTAG_INVALID_INPUT: {
    status: 400,
  },
} satisfies InternalErrorSchemas

const TOPIC_ERROR_SCHEMA = {
  TOPIC_NOT_FOUND: {
    status: 404,
  },
  TOPIC_INVALID_INPUT: {
    status: 400,
  },
  TOPIC_CANNOT_FOLLOW_SUSPENDED: {
    status: 409,
  },
  TOPIC_ALREADY_FOLLOWED: {
    status: 409,
  },
  TOPIC_NOT_FOLLOWED: {
    status: 409,
  },
} satisfies InternalErrorSchemas

const ELECTION_ERROR_SCHEMA = {
  ELECTION_NOT_FOUND: {
    status: 404,
  },
  ELECTION_REGISTER_TO_INVALID_TYPE: {
    status: 409,
  },
  ELECTION_NOT_IN_REGISTER_PERIOD: {
    status: 409,
  },
  ELECTION_WITHDRAW_TO_INVALID_TYPE: {
    status: 409,
  },
  ELECTION_NOT_IN_VOTE_PERIOD: {
    status: 409,
  },
  ELECTION_IN_VOTE_PERIOD: {
    status: 409,
  },
  ELECTION_VOTE_TO_INVALID_TYPE: {
    status: 409,
  },
  ELECTION_USER_ALREADY_VOTE: {
    status: 409,
  },
  ELECTION_CANDIDATE_NOT_FOUND: {
    status: 404,
  },
  ELECTION_INVALID_ELIGIBLE_VOTER_IDENTIFIER: {
    status: 409,
  },
  ELECTION_ALREADY_PUBLISH: {
    status: 409,
  },
  ELECTION_IS_CANCELLED: {
    status: 409,
  },
  ELECTION_KEY_NOT_IN_PENDING_CREATED_STATUS: {
    status: 409,
  },
  ELECTION_NOT_IN_CLOSED_VOTE_PERIOD: {
    status: 409,
  },
  ELECTION_INVALID_TYPE: {
    status: 409,
  },
  ELECTION_DUPLICATE_CANDIDATE: {
    status: 409,
  },
  ELECTION_VOTES_EXCEED_VOTERS: {
    status: 409,
  },
  ELECTION_INVALID_SIGNATURE: {
    status: 401,
  },
  ELECTION_KEY_NOT_READY: {
    status: 409,
  },
  ELECTION_ONLINE_RESULT_NOT_READY: {
    status: 409,
  },
  ELECTION_ALREADY_ANNOUCE_RESULT: {
    status: 409,
  },
} satisfies InternalErrorSchemas

export const ELECTION_KEY_ERROR_SCHEMA = {
  ELECTION_KEY_ALREADY_EXIST: {
    status: 409,
  },
  ELECTION_KEY_NOT_FOUND: {
    status: 404,
  },
  KEY_NOT_ENABLED: {
    status: 409,
  },
} satisfies InternalErrorSchemas

const MINI_APP_ERROR_SCHEMA = {
  MINI_APP_NOT_FOUND: {
    status: 404,
  },
  MINI_APP_INVALID_INPUT: {
    status: 400,
  },
} satisfies InternalErrorSchemas

export const NOTIFICATION_KEY_ERROR_SCHEMA = {
  NOTIFICATION_SENT_FAILED: {
    status: 500,
  },
} satisfies InternalErrorSchemas

export const InternalErrorCodeSchemas = {
  ...AUTH_ERROR_SCHEMA,
  ...COMMON_ERROR_SCHEMA,
  ...ABOUT_US_ERROR_SCHEMA,
  ...USER_ERROR_SCHEMA,
  ...FILE_ERROR_SCHEMA,
  ...FACEBOOK_ERROR_SCHEMA,
  ...FEED_ERROR_SCHEMA,
  ...ANNOUNCEMENT_ERROR_SCHEMA,
  ...POLL_ERROR_SCHEMA,
  ...BANNER_ERROR_SCHEMA,
  ...HASHTAG_ERROR_SCHEMA,
  ...TOPIC_ERROR_SCHEMA,
  ...ELECTION_ERROR_SCHEMA,
  ...MINI_APP_ERROR_SCHEMA,
  ...ELECTION_KEY_ERROR_SCHEMA,
  ...NOTIFICATION_KEY_ERROR_SCHEMA,
} as const
export type InternalErrorCodeSchemas = typeof InternalErrorCodeSchemas

type InternalErrorCodeEnum = {
  [K in keyof typeof InternalErrorCodeSchemas]: K
}
export const InternalErrorCode = Object.fromEntries(
  Object.keys(InternalErrorCodeSchemas).map((key) => [key, key])
) as InternalErrorCodeEnum
export type InternalErrorCode = keyof typeof InternalErrorCode
