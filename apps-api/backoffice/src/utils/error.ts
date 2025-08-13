import { TLiteral, TObject, TOptional, TString, TUnion, TUnknown } from '@sinclair/typebox'
import { Static, t } from 'elysia'
import { ElysiaCustomStatusResponse } from 'elysia/error'
import { Prettify2 } from 'elysia/types'
import { Err, err as defaultErr, ok, Result } from 'neverthrow'
import { groupBy, map, mapValues, pipe } from 'remeda'

import { RawPrismaError, resolvePrismaError } from './prisma'

import { InternalErrorCode, InternalErrorCodeSchemas } from '../dtos/error'

type ExtractExplicitErr<T> = T extends Err<infer _, infer E> ? E : never
type WithoutErr<T> = T extends Err<any, any> ? never : T
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

type GetArgumentFromErrorResponse<T extends ApiErrorResponse<InternalErrorCode>> =
  T extends ApiErrorResponse<any>
    ? [InternalErrorCodeSchemas[T['code']]['status'], { error: T }]
    : never

export type ExtractApiErrorResponse<T extends { code: any }> = T extends { code: InternalErrorCode }
  ? T
  : {}

export type ApiErrorSchema<TCode extends InternalErrorCode> = TCode extends InternalErrorCode
  ? TObject<{
      code: TLiteral<TCode>
      message: TOptional<TString>
      data: GetDataFromSchema<TCode>
    }>
  : never

export type ApiErrorResponse<TCode extends InternalErrorCode> = Static<ApiErrorSchema<TCode>>

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
  TParams extends GetArgumentFromErrorResponse<TError>,
  TStatusReturn extends ElysiaCustomStatusResponse<any, any, any>,
>(
  error: TError,
  status: (...args: TParams) => TStatusReturn
) => {
  const code = InternalErrorCodeSchemas[error.code].status
  throw (status as any)(code, { error })
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

export const fromRepositoryPromise = async <T>(
  promise: Promise<T> | (() => Promise<T>)
): Promise<Result<WithoutErr<T>, RawPrismaError | ExtractExplicitErr<T>>> => {
  let promiseEntry
  if (typeof promise === 'function') {
    promiseEntry = promise()
  } else {
    promiseEntry = promise
  }

  try {
    const result = await promiseEntry
    return ok(result as any)
  } catch (_err) {
    if (_err instanceof Err) {
      return _err
    }
    return err(resolvePrismaError(_err))
  }
}
