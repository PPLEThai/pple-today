import { TLiteral, TObject, TOptional, TString, TUnion, TUnknown } from '@sinclair/typebox'
import { Static, t } from 'elysia'
import { ElysiaCustomStatusResponse } from 'elysia/error'
import { Prettify2 } from 'elysia/types'
import { Err, err as defaultErr } from 'neverthrow'
import { groupBy, map, mapValues, pipe } from 'remeda'

import { InternalErrorCode, InternalErrorCodeSchemas } from '../dtos/error'

export type ApiErrorSchema<TCode extends InternalErrorCode> = TCode extends InternalErrorCode
  ? TObject<{
      code: TLiteral<TCode>
      message: TOptional<TString>
      data: GetDataFromSchema<TCode>
    }>
  : never

export type ApiErrorResponse<TCode extends InternalErrorCode> = Static<ApiErrorSchema<TCode>>

type GroupErrorCodeToStatusCode<
  T extends InternalErrorCode[],
  Result extends Record<number, InternalErrorCode[]> = {},
> = T extends [infer First extends InternalErrorCode, ...infer Rest extends InternalErrorCode[]]
  ? GroupErrorCodeToStatusCode<
      Rest,
      Prettify2<
        Omit<Result, InternalErrorCodeSchemas[First]['status']> & {
          [K in InternalErrorCodeSchemas[First]['status']]: K extends keyof Result
            ? [...Result[K], ApiErrorSchema<First>]
            : [ApiErrorSchema<First>]
        }
      >
    >
  : Result

type ConvertToApiErrorResponse<T extends Record<number, ApiErrorSchema<any>[]>> = {
  [K in keyof T]: T[K] extends ApiErrorSchema<any>[]
    ? TObject<{
        error: TUnion<T[K]>
      }>
    : never
}

type GetDataFromSchema<TCode extends InternalErrorCode> =
  TCode extends keyof InternalErrorCodeSchemas
    ? InternalErrorCodeSchemas[TCode] extends { data: any }
      ? InternalErrorCodeSchemas[TCode]['data']
      : TOptional<TUnknown>
    : never

export function tApiErrorResponse<TErrors extends [TObject, ...TObject[]]>(...errors: TErrors) {
  return t.Object({
    error: t.Union<TErrors>(errors),
  })
}

export function tApiError<const TCode extends InternalErrorCode>(code: TCode) {
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

export const createErrorSchema = <T extends [InternalErrorCode, ...InternalErrorCode[]]>(
  ...errors: T
): ConvertToApiErrorResponse<GroupErrorCodeToStatusCode<T>> => {
  return pipe(
    errors,
    map((error) => ({
      code: error,
      status: InternalErrorCodeSchemas[error].status,
    })),
    groupBy((error) => error.status),
    mapValues((errorSchemas) =>
      tApiErrorResponse(...map(errorSchemas, (errorSchema) => tApiError(errorSchema.code)))
    )
  ) as any
}

export const mapErrorCodeToResponse = <
  TError extends ApiErrorResponse<InternalErrorCode>,
  TCode extends TError['code'],
  TStatusCode extends InternalErrorCodeSchemas[TCode]['status'],
  TStatusReturn extends ElysiaCustomStatusResponse<any, any, any>,
>(
  error: TError,
  status: (statusCode: TStatusCode, body: { error: TError }) => TStatusReturn
) => {
  const code = InternalErrorCodeSchemas[error.code].status as TStatusCode
  throw status(code, { error })
}

export function exhaustiveGuard(_value: never): never {
  throw new Error(
    `ERROR! Reached forbidden guard function with unexpected value: ${JSON.stringify(_value)}`
  )
}

export function err<E>(_err: E | Err<never, E>): Err<never, E> {
  let errBody: any = _err

  if (_err instanceof Err) {
    errBody = _err.error
  }

  if (!('stack' in errBody)) {
    Error.captureStackTrace(errBody, err)
  }

  return defaultErr(errBody) as Err<never, E>
}
