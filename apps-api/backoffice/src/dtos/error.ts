import { TAnySchema, TOptional, TUnknown } from '@sinclair/typebox'
import { InvertedStatusMap, t } from 'elysia'

export type InternalErrorSchema = {
  status: keyof InvertedStatusMap
  data?: TAnySchema
}
export type InternalErrorSchemas = Record<string, null | InternalErrorSchema>

const COMMON_ERROR_SCHEMA = {
  UNAUTHORIZED: {
    status: 401,
  },
  FORBIDDEN: {
    status: 403,
  },
  NOT_FOUND: {
    status: 404,
  },
  BAD_REQUEST: {
    status: 400,
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

type GetDataFromSchema<TCode extends InternalErrorCode> =
  TCode extends keyof InternalErrorCodeSchemas
    ? InternalErrorCodeSchemas[TCode] extends { data: any }
      ? InternalErrorCodeSchemas[TCode]['data']
      : TOptional<TUnknown>
    : never

export function zApiErrorResponse<TErrors extends [TAnySchema, ...TAnySchema[]]>(
  ...errors: TErrors
) {
  return t.Object({
    error: t.Union<TErrors>(errors),
  })
}

export function zApiError<const TCode extends InternalErrorCode>(code: TCode) {
  const data: GetDataFromSchema<TCode> =
    'data' in InternalErrorCodeSchemas[code]
      ? (InternalErrorCodeSchemas[code].data ?? t.Optional(t.Unknown()))
      : (t.Optional(t.Unknown()) as any)

  return t.Object({
    code: t.Literal(code),
    message: t.Optional(t.String()),
    data,
  })
}

const x = zApiError('POST_REACTION_ALREADY_EXISTS')
type P = GetDataFromSchema<'FORBIDDEN'>
