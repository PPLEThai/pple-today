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
  FILE_UPLOAD_ERROR: {
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
  FILE_CREATE_SIGNED_URL_ERROR: {
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
} satisfies InternalErrorSchemas

const POST_ERROR_SCHEMA = {
  POST_NOT_FOUND: {
    status: 404,
  },
  POST_COMMENT_NOT_FOUND: {
    status: 404,
  },
  POST_REACTION_NOT_FOUND: {
    status: 404,
  },
  POST_REACTION_ALREADY_EXISTS: {
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
} satisfies InternalErrorSchemas

export const InternalErrorCodeSchemas = {
  ...AUTH_ERROR_SCHEMA,
  ...COMMON_ERROR_SCHEMA,
  ...POST_ERROR_SCHEMA,
  ...ABOUT_US_ERROR_SCHEMA,
  ...USER_ERROR_SCHEMA,
  ...FILE_ERROR_SCHEMA,
  ...FACEBOOK_ERROR_SCHEMA,
  ...ANNOUNCEMENT_ERROR_SCHEMA,
} as const
export type InternalErrorCodeSchemas = typeof InternalErrorCodeSchemas

type InternalErrorCodeEnum = {
  [K in keyof typeof InternalErrorCodeSchemas]: K
}
export const InternalErrorCode = Object.fromEntries(
  Object.keys(InternalErrorCodeSchemas).map((key) => [key, key])
) as InternalErrorCodeEnum
export type InternalErrorCode = keyof typeof InternalErrorCode
