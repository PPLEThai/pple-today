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

export const QUERY_KEY_SYMBOL = '$'

function createReactQueryClient<TSchema extends Record<string, any>>(
  restClient: EdenFetch.Fn<TSchema>
): ReactQueryClient<TSchema> {
  const makeRequest = async (method: any, path: any, payload: any) => {
    const result = await restClient(path, {
      method,
      path,
      query: payload?.query ?? {},
      params: payload?.pathParams ?? {},
      body: payload?.body ?? undefined,
      headers: payload?.headers ?? {},
    })

    if (result.status >= 400) {
      throw result.error
    }

    return result.data
  }

  function getKey(
    method: any,
    path: any,
    payload: { pathParams?: any; query?: any; headers?: any } = {}
  ): any {
    const { pathParams, query, headers } = payload
    const key: unknown[] = [QUERY_KEY_SYMBOL, method, path, pathParams, query, headers]
    while (key.length > 0 && key[key.length - 1] === undefined) {
      key.pop()
    }
    return key
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
    getQueryKey: (...args) => getKey('get', ...args),
  }
}

export function createApiClient<T extends AnyElysia>(
  server: string,
  options?: EdenFetch.Config
): CreateReactQueryClientResult<T> {
  const fetchClient: any = edenFetch<T>(server, options)

  async function wrappedFetchClient(...params: Parameters<typeof edenFetch>) {
    const path = params[0] as string
    const requestConfig: any = await wrappedFetchClient.interceptors.request(params[1] as any)

    const resp = await fetchClient(path, requestConfig)

    return await wrappedFetchClient.interceptors.response(resp)
  }

  wrappedFetchClient.interceptors = {
    request: (config: RequestConfig) => {
      return config
    },
    response: (response: ResponseConfig) => {
      return response
    },
  } as FetchClientInterceptors

  const reactQueryClient: any = createReactQueryClient(wrappedFetchClient as typeof fetchClient)

  return { fetchClient: wrappedFetchClient as any, reactQueryClient }
}
