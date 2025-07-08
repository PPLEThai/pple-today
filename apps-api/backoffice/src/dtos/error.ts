import { TAnySchema } from '@sinclair/typebox'

export type InternalErrorSchema = Record<string, null | TAnySchema>

const COMMON_ERROR_SCHEMA = {
  UNAUTHORIZED: null,
  FORBIDDEN: null,
  NOT_FOUND: null,
  BAD_REQUEST: null,
  INTERNAL_SERVER_ERROR: null,
} satisfies InternalErrorSchema

const POST_ERROR_SCHEMA = {
  POST_NOT_FOUND: null,
  POST_COMMENT_NOT_FOUND: null,
  POST_REACTION_NOT_FOUND: null,
  POST_REACTION_ALREADY_EXISTS: null,
} satisfies InternalErrorSchema

export const internalErrorSchemas = {
  ...COMMON_ERROR_SCHEMA,
  ...POST_ERROR_SCHEMA,
}

export type InternalErrorType = keyof typeof internalErrorSchemas
