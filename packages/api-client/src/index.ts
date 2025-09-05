import { edenFetch } from '@elysiajs/eden'
import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'
import type { AnyElysia } from 'elysia'

import type {
  CreateReactQueryClientResult,
  EdenFetch,
  FetchClientInterceptors,
  ReactQueryClient,
  RequestConfig,
  ResponseConfig,
} from './types'

export type {
  CreateReactQueryClientResult,
  ExtractBodyRequest,
  ExtractBodyResponse,
  FetchClientInterceptors,
  ReactQueryClient as QueryClient,
  RequestConfig,
  ResponseConfig,
} from './types'

export const QUERY_KEY = '$'

function createReactQueryClient<TSchema extends Record<string, any>>(
  restClient: EdenFetch.Fn<TSchema> & {
    interceptors: FetchClientInterceptors
  }
): ReactQueryClient<TSchema> {
  const makeRequest = async (method: any, path: any, payload: any) => {
    const requestConfig: any = await restClient.interceptors.request({
      method,
      path,
      query: payload?.query ?? {},
      params: payload?.pathParams ?? {},
      body: payload?.body ?? undefined,
      headers: payload?.headers ?? {},
    })

    const resp = await restClient(path, requestConfig)

    return restClient.interceptors.response(resp)
  }

  function getKey(method: any, path: any, payload: any = {}) {
    return [QUERY_KEY, method, path, payload?.pathParams, payload?.query, payload?.headers]
  }

  function getQueryKey(path: any, payload: any = {}) {
    return [QUERY_KEY, 'get', path, payload?.pathParams, payload?.query, payload?.headers]
  }

  return {
    useQuery: function (path: any, payload: any, options?: any) {
      return useQuery({
        queryKey: getKey('get', path, payload),
        queryFn: () => makeRequest('get', path, payload),
        ...options,
      }) as UseQueryResult<any, any>
    },
    useMutation: function (method: any, path: any, options?: any) {
      return useMutation({
        mutationKey: getKey(method, path),
        mutationFn: (data) => makeRequest(method, path, data),
        ...options,
      }) as UseMutationResult<any, any, any, any>
    },
    queryOptions: function (path: any, payload: any, options?: any) {
      return {
        queryKey: getKey('get', path, payload),
        queryFn: () => makeRequest('get', path, payload),
        ...options,
      } as UseQueryOptions<any, any, any>
    },
    mutationOptions: function (method: any, path: any, options?: any) {
      return {
        mutationKey: getKey(method, path),
        mutationFn: (data) => makeRequest(method, path, data),
        ...options,
      } as UseMutationOptions<any, any, any, any>
    },
    getKey,
    getQueryKey,
  }
}

export function createApiClient<T extends AnyElysia>(
  server: string,
  options?: EdenFetch.Config
): CreateReactQueryClientResult<T> {
  const fetchClient: any = edenFetch<T>(server, options)
  // Default interceptor
  fetchClient.interceptors = {
    request: (config: RequestConfig) => {
      return config
    },
    response: (response: ResponseConfig) => {
      if (response.status >= 400) {
        throw response.error
      }
      return response.data
    },
  } satisfies FetchClientInterceptors

  const reactQueryClient: any = createReactQueryClient(fetchClient)

  return { fetchClient, reactQueryClient }
}
