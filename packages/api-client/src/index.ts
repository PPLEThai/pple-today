import { edenFetch } from '@elysiajs/eden'
import { QueryClient, useMutation, type UseMutationResult, useQuery } from '@tanstack/react-query'
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
  const makeRequest = async (
    options: { method?: any; path?: any; pathParams?: any; query?: any; headers?: any } = {},
    body?: any
  ) => {
    const result = await restClient(options.path, {
      method: options.method,
      path: options.path,
      params: options.pathParams,
      query: options.query,
      headers: options.headers,
      body: body,
    })

    if (result.status >= 400) {
      throw result.error
    }

    return result.data
  }

  function getKey(
    options: { method?: any; path?: any; pathParams?: any; query?: any; headers?: any } = {}
  ): any {
    const key: unknown[] = [
      QUERY_KEY_SYMBOL,
      options.method,
      options.path,
      options.pathParams,
      options.query,
      options.headers,
    ]
    while (key.length > 0 && key[key.length - 1] === undefined) {
      key.pop()
    }
    return key
  }

  return {
    useQuery: function (
      { path, pathParams, query, headers, ...rest }: any,
      queryClient?: QueryClient
    ) {
      const options = { method: 'get', path, pathParams, query, headers }
      return useQuery(
        {
          queryKey: getKey(options),
          queryFn: () => makeRequest(options),
          ...rest,
        },
        queryClient
      )
    },
    useMutation: function ({ method, path, pathParams, query, headers, ...mutationOptions }: any) {
      const options = { method, path, pathParams, query, headers }
      return useMutation({
        mutationKey: getKey(options),
        mutationFn: (body) => makeRequest(options, body),
        ...mutationOptions,
      }) as UseMutationResult<any, any, any, any>
    },
    getKey,
    getQueryKey: (options) => getKey({ method: 'get', ...options }),
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
