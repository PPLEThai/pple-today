import { TLiteral, TObject, TOptional, TString, TUnion, TUnknown } from '@sinclair/typebox'
import { Static, t } from 'elysia'
import { ElysiaCustomStatusResponse } from 'elysia/error'
import { Prettify2 } from 'elysia/types'
import { Err, err as defaultErr, ok, Result } from 'neverthrow'
import { groupBy, map, mapValues, pipe } from 'remeda'
import { Simplify, ValueOf } from 'type-fest'

import { RawPrismaError, resolvePrismaError } from './prisma'

import { InternalErrorCode, InternalErrorCodeSchemas } from '../dtos/error'

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

export type ExtractExplicitErr<T> = T extends Err<infer _, infer E> ? E : never
export type WithoutErr<T> = T extends Err<any, any> ? never : T
export type OnlyErr<T> = T extends Err<any, any> ? T : never

export type ExtractApiErrorResponse<T extends { code: any }> = T extends { code: InternalErrorCode }
  ? T
  : never

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
): Promise<Result<WithoutErr<T>, OnlyErr<T> | RawPrismaError | ExtractExplicitErr<T>>> => {
  let promiseEntry
  if (typeof promise === 'function') {
    promiseEntry = promise()
  } else {
    promiseEntry = promise
  }

  try {
    const result = await promiseEntry

    if (result instanceof Err) {
      return result as any
    }

    return ok(result as any)
  } catch (_err) {
    if (_err instanceof Err) {
      return _err
    }
    return err(resolvePrismaError(_err))
  }
}

export const mapRepositoryError = <
  T extends RawPrismaError | ApiErrorResponse<InternalErrorCode>,
  U extends Partial<
    Record<RawPrismaError['code'], ApiErrorResponse<InternalErrorCode>> & {
      INTERNAL_SERVER_ERROR?: string
    }
  > = {},
>(
  error: T,
  mapping?: U
): Err<
  never,
  | Simplify<
      ValueOf<
        Omit<U, 'INTERNAL_SERVER_ERROR'> & {
          INTERNAL_SERVER_ERROR: ApiErrorResponse<typeof InternalErrorCode.INTERNAL_SERVER_ERROR>
        }
      >
    >
  | ExtractApiErrorResponse<T>
> => {
  const mappedError = (mapping as any)?.[error.code]

  if (mappedError) {
    return err(mappedError) as any
  }

  if (error.code in InternalErrorCode) {
    return err({
      code: error.code as InternalErrorCode,
      message: error.message,
    }) as any
  }

  return err({
    code: InternalErrorCode.INTERNAL_SERVER_ERROR,
    message: mapping?.INTERNAL_SERVER_ERROR ?? 'An unexpected error occurred',
  }) as any
}
