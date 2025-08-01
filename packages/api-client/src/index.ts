import { edenFetch } from '@elysiajs/eden'
import {
  useMutation,
  UseMutationOptions,
  UseMutationResult,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query'

import { ApiSchema } from '@api/backoffice'

import { EdenFetch, QueryClient } from './types'

function createQueryClient<TSchema extends Record<string, any>>(
  restClient: EdenFetch.Fn<TSchema>
): QueryClient<TSchema> {
  const makeRequest = async (method: any, path: any, payload: any) => {
    const resp = await restClient(path, {
      method,
      params: payload?.pathParams ?? {},
      query: payload?.query ?? {},
      headers: payload?.headers ?? {},
      body: payload?.body,
    })

    if (resp.status >= 300) {
      throw resp.error
    }

    return resp.data
  }

  return {
    useQuery: function (method: any, path: any, payload: any, options?: any) {
      return useQuery({
        queryKey: queryKey(method, path, payload),
        queryFn: () => makeRequest(method, path, payload),
        ...options,
      }) as UseQueryResult<any, any>
    },
    useMutation: function (method: any, path: any, options?: any) {
      return useMutation({
        mutationKey: queryKey(method, path),
        mutationFn: (data) => makeRequest(method, path, data),
        ...options,
      }) as UseMutationResult<any, any, any, any>
    },
    queryOptions: function (method: any, path: any, payload: any, options?: any) {
      return {
        queryKey: queryKey(method, path, payload),
        queryFn: () => makeRequest(method, path, payload),
        ...options,
      } as UseQueryOptions<any, any, any>
    },
    mutationOptions: function (method: any, path: any, options?: any) {
      return {
        mutationKey: queryKey(method, path),
        mutationFn: (data) => makeRequest(method, path, data),
        ...options,
      } as UseMutationOptions<any, any, any, any>
    },
  }
}

export function queryKey(method: string, path: string | number | symbol, payload?: any) {
  const payloadKey = {
    pathParams: payload?.pathParams ?? {},
    query: payload?.query ?? {},
    headers: payload?.headers ?? {},
  }
  return [method, path, payloadKey] as const
}

export function createReactQueryClient(server: string, options?: EdenFetch.Config) {
  const fetchClient = edenFetch<ApiSchema>(server, options)
  const reactQueryClient = createQueryClient(fetchClient)

  return { fetchClient, reactQueryClient }
}
