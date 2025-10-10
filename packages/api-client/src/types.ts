import type { EdenFetch } from '@elysiajs/eden/fetch'
import type {
  dataTagErrorSymbol,
  dataTagSymbol,
  DefinedInitialDataOptions,
  DefinedUseQueryResult,
  QueryClient,
  QueryKey,
  UndefinedInitialDataOptions,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query'
import type { AnyElysia } from 'elysia'
import type { Prettify2 } from 'elysia/types'
import type { ConditionalExcept, IntClosedRange, IsNever, ValueOf } from 'type-fest'

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

export type RestPayload<TSchema extends Record<string, any>> = ConditionalExcept<
  {
    body: GetBody<TSchema>
    query: GetQuery<TSchema>
    pathParams: GetPathParams<TSchema>
  } & GetHeaders<TSchema>,
  never
>

export type EdenError<
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

type QueryMethod = 'get'
type MutationMethod = 'post' | 'put' | 'patch' | 'delete'

type SuccessRange = IntClosedRange<200, 299>
export type EdenSuccess<TResponse extends Record<string, unknown>> = {
  [K in keyof TResponse as K extends SuccessRange ? K : never]: TResponse[K]
}

export type EdenResponse<TSchema extends Record<string, unknown>> = Prettify2<
  TSchema extends { response: infer TResponse extends Record<string, unknown> }
    ? ValueOf<EdenSuccess<TResponse>>
    : never
>

export type GetEdenFetchSchema<T extends AnyElysia> =
  EdenFetch.Create<T> extends EdenFetch.Fn<infer Schema> ? Schema : never

export type ExtractBodyRequest<
  TElysia extends AnyElysia,
  TMethod extends GetAvailableMethods<GetEdenFetchSchema<TElysia>> = GetAvailableMethods<
    GetEdenFetchSchema<TElysia>
  >,
  TPath extends keyof GroupPathByMethod<
    GetEdenFetchSchema<TElysia>,
    TMethod
  >[TMethod] = keyof GroupPathByMethod<GetEdenFetchSchema<TElysia>, TMethod>[TMethod],
  TEndpoint extends GroupPathByMethod<
    GetEdenFetchSchema<TElysia>,
    TMethod
  >[TMethod][TPath] = GroupPathByMethod<GetEdenFetchSchema<TElysia>, TMethod>[TMethod][TPath],
> = GetBody<TEndpoint>

export type ExtractBodyResponse<
  TElysia extends AnyElysia,
  TMethod extends GetAvailableMethods<GetEdenFetchSchema<TElysia>> = GetAvailableMethods<
    GetEdenFetchSchema<TElysia>
  >,
  TPath extends keyof GroupPathByMethod<
    GetEdenFetchSchema<TElysia>,
    TMethod
  >[TMethod] = keyof GroupPathByMethod<GetEdenFetchSchema<TElysia>, TMethod>[TMethod],
  TEndpoint extends GroupPathByMethod<
    GetEdenFetchSchema<TElysia>,
    TMethod
  >[TMethod][TPath] = GroupPathByMethod<GetEdenFetchSchema<TElysia>, TMethod>[TMethod][TPath],
> = EdenResponse<TEndpoint>

type QueryPathSchema<
  TPathSchema extends Record<string, any>,
  TAvailableMethod extends GetAvailableMethods<TPathSchema>,
> = GroupPathByMethod<TPathSchema, TAvailableMethod>[Extract<TAvailableMethod, QueryMethod>]

type QueryOptions<
  TPathSchema extends Record<string, any>,
  TAvailableMethod extends GetAvailableMethods<TPathSchema>,
  TPath extends keyof QueryPathSchema<TPathSchema, TAvailableMethod>,
> = {
  path: TPath
} & RestPayload<QueryPathSchema<TPathSchema, TAvailableMethod>[TPath]>

type MutationPathSchema<
  TPathSchema extends Record<string, any>,
  TAvailableMethod extends GetAvailableMethods<TPathSchema>,
  TMethod extends Extract<TAvailableMethod, MutationMethod>,
> = GroupPathByMethod<TPathSchema, TAvailableMethod>[Extract<TAvailableMethod, TMethod>]

type MutationOptions<
  TPathSchema extends Record<string, any>,
  TAvailableMethod extends GetAvailableMethods<TPathSchema>,
  TMethod extends Extract<TAvailableMethod, MutationMethod> = Extract<
    TAvailableMethod,
    MutationMethod
  >,
  TPath extends keyof MutationPathSchema<
    TPathSchema,
    TAvailableMethod,
    TMethod
  > = keyof MutationPathSchema<TPathSchema, TAvailableMethod, TMethod>,
> = {
  method: TMethod
  path: TPath
}

export interface ReactQueryClient<
  TPathSchema extends Record<string, any>,
  TAvailableMethod extends GetAvailableMethods<TPathSchema> = GetAvailableMethods<TPathSchema>,
  TGroupedPathByMethod extends GroupPathByMethod<TPathSchema, TAvailableMethod> = GroupPathByMethod<
    TPathSchema,
    TAvailableMethod
  >,
> {
  useQuery: {
    <
      TPath extends keyof QueryPathSchema<TPathSchema, TAvailableMethod>,
      TQueryFnData = EdenResponse<QueryPathSchema<TPathSchema, TAvailableMethod>[TPath]>,
      TError = EdenError<QueryPathSchema<TPathSchema, TAvailableMethod>[TPath]>,
      TData = TQueryFnData,
      TQueryKey extends QueryKey = QueryKey,
    >(
      options: Omit<
        DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>,
        'queryKey' | 'queryFn'
      > &
        QueryOptions<TPathSchema, TAvailableMethod, TPath>,
      queryClient?: QueryClient
    ): DefinedUseQueryResult<NoInfer<TData>, TError>

    <
      TPath extends keyof QueryPathSchema<TPathSchema, TAvailableMethod>,
      TQueryFnData = EdenResponse<QueryPathSchema<TPathSchema, TAvailableMethod>[TPath]>,
      TError = EdenError<QueryPathSchema<TPathSchema, TAvailableMethod>[TPath]>,
      TData = TQueryFnData,
      TQueryKey extends QueryKey = QueryKey,
    >(
      options: Omit<
        UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>,
        'queryKey' | 'queryFn'
      > &
        QueryOptions<TPathSchema, TAvailableMethod, TPath>,
      queryClient?: QueryClient
    ): UseQueryResult<NoInfer<TData>, TError>

    <
      TPath extends keyof QueryPathSchema<TPathSchema, TAvailableMethod>,
      TQueryFnData = EdenResponse<QueryPathSchema<TPathSchema, TAvailableMethod>[TPath]>,
      TError = EdenError<QueryPathSchema<TPathSchema, TAvailableMethod>[TPath]>,
      TData = TQueryFnData,
      TQueryKey extends QueryKey = QueryKey,
    >(
      options: Omit<
        UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
        'queryKey' | 'queryFn'
      > &
        QueryOptions<TPathSchema, TAvailableMethod, TPath>,
      queryClient?: QueryClient
    ): UseQueryResult<NoInfer<TData>, TError>
  }

  useMutation: <
    TMethod extends Extract<TAvailableMethod, MutationMethod>,
    TPath extends keyof MutationPathSchema<TPathSchema, TAvailableMethod, TMethod>,
    TData = EdenResponse<MutationPathSchema<TPathSchema, TAvailableMethod, TMethod>[TPath]>,
    TError = EdenError<MutationPathSchema<TPathSchema, TAvailableMethod, TMethod>[TPath]>,
    TVariables = RestPayload<MutationPathSchema<TPathSchema, TAvailableMethod, TMethod>[TPath]>,
    TContext = unknown,
  >(
    options: Omit<
      UseMutationOptions<TData, TError, TVariables, TContext>,
      'mutationKey' | 'mutationFn'
    > &
      MutationOptions<TPathSchema, TAvailableMethod, TMethod, TPath>,
    queryClient?: QueryClient
  ) => UseMutationResult<TData, TError, TVariables, TContext>

  // TODO: queryOptions
  // TODO: mutationOptions

  getKey: <
    const TMethod extends TAvailableMethod,
    const TPath extends keyof TGroupedPathByMethod[TMethod],
    const TSchema extends
      TGroupedPathByMethod[TMethod][TPath] = TGroupedPathByMethod[TMethod][TPath],
    const TResponse extends
      TGroupedPathByMethod[TMethod][TPath] = TGroupedPathByMethod[TMethod][TPath],
    const TSuccess extends EdenResponse<TResponse> = EdenResponse<TResponse>,
    const TError extends EdenError<TResponse> = EdenError<TResponse>,
  >(options?: {
    method?: TMethod
    path?: TPath
    pathParams?: GetPathParams<TSchema>
    query?: GetQuery<TSchema>
    headers?: GetHeaders<TSchema>
  }) => QueryKey & {
    [dataTagSymbol]: TSuccess
    [dataTagErrorSymbol]: TError
  }
  getQueryKey: <
    const TMethod extends Extract<TAvailableMethod, QueryMethod>,
    const TPath extends keyof TGroupedPathByMethod[TMethod],
    const TSchema extends
      TGroupedPathByMethod[TMethod][TPath] = TGroupedPathByMethod[TMethod][TPath],
    const TResponse extends
      TGroupedPathByMethod[TMethod][TPath] = TGroupedPathByMethod[TMethod][TPath],
    const TSuccess extends EdenResponse<TResponse> = EdenResponse<TResponse>,
    const TError extends EdenError<TResponse> = EdenError<TResponse>,
  >(options: {
    path: TPath
    pathParams?: GetPathParams<TSchema>
    query?: GetQuery<TSchema>
    headers?: GetHeaders<TSchema>
  }) => QueryKey & {
    [dataTagSymbol]: TSuccess
    [dataTagErrorSymbol]: TError
  }
}

export interface RequestConfig {
  method: string
  path: string
  query?: Record<string, any>
  body?: any
  params?: Record<string, string>
  headers?: Record<string, string>
}

export type ResponseConfig =
  | {
      data: any
      error: null
      headers: Record<string, unknown>
      status: number
    }
  | {
      data: null
      error: any
      headers: Record<string, unknown>
      status: number
    }

export interface FetchClientInterceptors {
  request: (config: RequestConfig) => Promise<RequestConfig> | RequestConfig
  response: (response: ResponseConfig) => any
}

export interface CreateReactQueryClientResult<T extends AnyElysia> {
  fetchClient: EdenFetch.Create<T> & {
    interceptors: FetchClientInterceptors
  }
  reactQueryClient: ReactQueryClient<GetEdenFetchSchema<T>>
}
export { type EdenFetch }
