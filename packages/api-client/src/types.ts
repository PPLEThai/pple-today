export { type EdenFetch } from '@elysiajs/eden/fetch'
import {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query'
import { Prettify2 } from 'elysia/types'
import { ConditionalExcept, IntClosedRange, IsNever, ValueOf } from 'type-fest'

type ErrorRange = IntClosedRange<300, 599>

/**
 * Due to module resolution issues in application,
 * we need to explicitly declare `EdenFetchError`, `BaseEdenError` and `MapError` here instead of importing it from
 * - `@elysiajs/eden/dist/fetch`
 * - `@elysiajs/eden/dist/errors`
 *
 * MIT License
 *
 * Copyright 2022 saltyAom
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 */

declare class EdenFetchError<Status extends number = number, Value = unknown> extends Error {
  status: Status
  value: Value
  constructor(status: Status, value: Value)
}

type MapError<T extends Record<number, unknown>> = [
  {
    [K in keyof T]-?: K extends ErrorRange ? K : never
  }[keyof T],
] extends [infer A extends number]
  ? {
      [K in A]: EdenFetchError<K, T[K]>
    }[A]
  : false

// Ref: https://github.com/elysiajs/eden/blob/c1fa86868fd195500bacbb84c25c6d19c2de1349/src/fetch/types.ts#L75
type BaseEdenError<TSchema extends Record<string, unknown>> = TSchema extends {
  response: infer TResponse extends Record<string, unknown>
}
  ? MapError<TResponse> extends infer Errors
    ? IsNever<Errors> extends true
      ? EdenFetchError<number, string>
      : Errors
    : EdenFetchError<number, string>
  : never

type GetAvailableMethods<TApiRouter extends Record<string, any>> = {
  [K in keyof TApiRouter]: keyof TApiRouter[K]
}[keyof TApiRouter]

type GroupPathByMethod<
  TApiRouter extends {},
  TMethod extends GetAvailableMethods<TApiRouter> = GetAvailableMethods<TApiRouter>,
> = {
  [K in TMethod]: {
    [P in keyof TApiRouter as K extends keyof TApiRouter[P] ? P : never]: TApiRouter[P][K]
  }
}

type GetBody<TSchema extends Record<string, any>> = TSchema extends {
  body: infer TBody extends Record<string, any>
}
  ? TBody
  : never

type GetQuery<TSchema extends Record<string, any>> = TSchema extends {
  query: infer TQuery extends Record<string, any>
}
  ? TQuery
  : never

type GetHeaders<TSchema extends Record<string, any>> = TSchema extends { headers: infer THeaders }
  ? THeaders extends Record<string, any>
    ? { headers: THeaders & Record<string, unknown> }
    : { headers?: Record<string, unknown> }
  : { headers?: Record<string, unknown> }

type GetPathParams<TSchema extends Record<string, any>> = TSchema extends {
  params: infer TPathParams extends Record<string, any>
}
  ? {} extends TPathParams
    ? never
    : TPathParams
  : never

type RestPayload<TSchema extends Record<string, any>> = ConditionalExcept<
  {
    body: GetBody<TSchema>
    query: GetQuery<TSchema>
    pathParams: GetPathParams<TSchema>
  } & GetHeaders<TSchema>,
  never
>

type EdenError<
  TSchema extends Record<string, unknown>,
  TError extends BaseEdenError<TSchema> = BaseEdenError<TSchema>,
> =
  | (TError extends { value: { type: 'validation' } } ? never : TError)
  | EdenFetchError<
      422,
      {
        error: {
          code: 'VALIDATION_ERROR'
          message?: string | undefined
          data?: unknown
        }
      }
    >
  | EdenFetchError<
      500,
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR'
          message?: string | undefined
          data?: unknown
        }
      }
    >

type SuccessRange = IntClosedRange<200, 299>
type EdenSuccess<TResponse extends Record<string, unknown>> = {
  [K in keyof TResponse as K extends SuccessRange ? K : never]: TResponse[K]
}

type EdenResponse<TSchema extends Record<string, unknown>> = Prettify2<
  TSchema extends { response: infer TResponse extends Record<string, unknown> }
    ? ValueOf<EdenSuccess<TResponse>>
    : never
>

export interface QueryClient<
  TPathSchema extends Record<string, any>,
  TAvailableMethod extends GetAvailableMethods<TPathSchema> = GetAvailableMethods<TPathSchema>,
  TGroupedPathByMethod extends GroupPathByMethod<TPathSchema, TAvailableMethod> = GroupPathByMethod<
    TPathSchema,
    TAvailableMethod
  >,
> {
  useQuery: <
    const TMethod extends TAvailableMethod,
    const TPath extends keyof TGroupedPathByMethod[TMethod],
    const TPayload extends RestPayload<TGroupedPathByMethod[TMethod][TPath]> = RestPayload<
      TGroupedPathByMethod[TMethod][TPath]
    >,
    const TResponse extends
      TGroupedPathByMethod[TMethod][TPath] = TGroupedPathByMethod[TMethod][TPath],
    const TSuccess extends EdenResponse<TResponse> = EdenResponse<TResponse>,
    const TError extends EdenError<TResponse> = EdenError<TResponse>,
  >(
    method: TMethod,
    path: TPath,
    payload: TPayload,
    options?: Omit<UseQueryOptions<TSuccess, TError, TPayload>, 'queryKey'>
  ) => UseQueryResult<TSuccess, TError>
  useMutation: <
    const TMethod extends TAvailableMethod,
    const TPath extends keyof TGroupedPathByMethod[TMethod],
    const TPayload extends RestPayload<TGroupedPathByMethod[TMethod][TPath]> = RestPayload<
      TGroupedPathByMethod[TMethod][TPath]
    >,
    const TResponse extends
      TGroupedPathByMethod[TMethod][TPath] = TGroupedPathByMethod[TMethod][TPath],
    const TSuccess extends EdenResponse<TResponse> = EdenResponse<TResponse>,
    const TError extends EdenError<TResponse> = EdenError<TResponse>,
    const TContext = unknown,
  >(
    method: TMethod,
    path: TPath,
    options?: UseMutationOptions<TSuccess, TError, TPayload, TContext>
  ) => UseMutationResult<TSuccess, TError, TPayload, TContext>
  queryOptions: <
    const TMethod extends TAvailableMethod,
    const TPath extends keyof TGroupedPathByMethod[TMethod],
    const TPayload extends RestPayload<TGroupedPathByMethod[TMethod][TPath]> = RestPayload<
      TGroupedPathByMethod[TMethod][TPath]
    >,
    const TResponse extends
      TGroupedPathByMethod[TMethod][TPath] = TGroupedPathByMethod[TMethod][TPath],
    const TSuccess extends EdenResponse<TResponse> = EdenResponse<TResponse>,
    const TError extends EdenError<TResponse> = EdenError<TResponse>,
  >(
    method: TMethod,
    path: TPath,
    payload: TPayload,
    options?: Omit<UseQueryOptions<TSuccess, TError, TPayload>, 'queryKey'>
  ) => UseQueryOptions<TSuccess, TError, TPayload>
  mutationOptions: <
    const TMethod extends TAvailableMethod,
    const TPath extends keyof TGroupedPathByMethod[TMethod],
    const TPayload extends RestPayload<TGroupedPathByMethod[TMethod][TPath]> = RestPayload<
      TGroupedPathByMethod[TMethod][TPath]
    >,
    const TResponse extends
      TGroupedPathByMethod[TMethod][TPath] = TGroupedPathByMethod[TMethod][TPath],
    const TSuccess extends EdenResponse<TResponse> = EdenResponse<TResponse>,
    const TError extends EdenError<TResponse> = EdenError<TResponse>,
    const TContext = unknown,
  >(
    method: TMethod,
    path: TPath,
    options?: UseMutationOptions<TSuccess, TError, TPayload, TContext>
  ) => UseMutationOptions<TSuccess, TError, TPayload, TContext>
}
