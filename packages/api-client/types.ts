import { EdenFetchError } from '@elysiajs/eden/dist/errors'
import { MapError } from '@elysiajs/eden/dist/types'
import {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query'
import { Prettify2 } from 'elysia/dist/types'
import { ConditionalExcept, IntClosedRange, IsNever, ValueOf } from 'type-fest'

import { type InternalErrorCode } from '@api/backoffice/src/dtos/error'

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

type GetBody<TSchema extends Record<string, any>> = TSchema extends { body: infer TBody }
  ? TBody extends Record<string, any>
    ? TBody
    : never
  : never

type GetQuery<TSchema extends Record<string, any>> = TSchema extends { query: infer TQuery }
  ? TQuery extends Record<string, any>
    ? TQuery
    : never
  : never

type GetHeaders<TSchema extends Record<string, any>> = TSchema extends { headers: infer THeaders }
  ? THeaders extends Record<string, any>
    ? { headers: THeaders } & Record<string, unknown>
    : { headers?: Record<string, unknown> }
  : { headers?: Record<string, unknown> }

type GetPathParams<TSchema extends Record<string, any>> = TSchema extends {
  params: infer TPathParams
}
  ? TPathParams extends Record<string, any>
    ? TPathParams
    : never
  : never

type RestPayload<TSchema extends Record<string, any>> = ConditionalExcept<
  {
    body: GetBody<TSchema>
    query: GetQuery<TSchema>
    pathParams: GetPathParams<TSchema>
  } & GetHeaders<TSchema>,
  never
>

type EdenError<TSchema extends Record<string, unknown>> = TSchema extends {
  response: infer TResponse extends Record<string, unknown>
}
  ? MapError<TResponse> extends infer Errors
    ? IsNever<Errors> extends true
      ? EdenFetchError<number, string>
      : Errors
    : EdenFetchError<number, string>
  : never

type InjectEdenError<
  TSchema extends Record<string, unknown>,
  TError extends EdenError<TSchema> = EdenError<TSchema>,
> =
  | (TError extends { value: { type: 'validation' } } ? never : TError)
  | EdenFetchError<
      422,
      {
        error: {
          code: typeof InternalErrorCode.VALIDATION_ERROR
          message?: string | undefined
          data?: unknown
        }
      }
    >
  | EdenFetchError<
      500,
      {
        error: {
          code: typeof InternalErrorCode.INTERNAL_SERVER_ERROR
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
    const TError extends InjectEdenError<TResponse> = InjectEdenError<TResponse>,
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
    const TError extends InjectEdenError<TResponse> = InjectEdenError<TResponse>,
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
    const TError extends InjectEdenError<TResponse> = InjectEdenError<TResponse>,
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
    const TError extends InjectEdenError<TResponse> = InjectEdenError<TResponse>,
    const TContext = unknown,
  >(
    method: TMethod,
    path: TPath,
    options?: UseMutationOptions<TSuccess, TError, TPayload, TContext>
  ) => UseMutationOptions<TSuccess, TError, TPayload, TContext>
}
