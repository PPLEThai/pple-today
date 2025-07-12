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

export const InternalErrorCodeSchemas = {
  ...COMMON_ERROR_SCHEMA,
  ...POST_ERROR_SCHEMA,
} as const
export type InternalErrorCodeSchemas = typeof InternalErrorCodeSchemas

type InternalErrorCodeEnum = {
  [K in keyof typeof InternalErrorCodeSchemas]: K
}
export const InternalErrorCode = Object.fromEntries(
  Object.keys(InternalErrorCodeSchemas).map((key) => [key, key])
) as InternalErrorCodeEnum
export type InternalErrorCode = keyof typeof InternalErrorCode
