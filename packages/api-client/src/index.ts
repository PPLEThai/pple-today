import { edenFetch } from '@elysiajs/eden'
import {
  useMutation,
  UseMutationOptions,
  UseMutationResult,
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query'
import Elysia from 'elysia'

import { CreateReactQueryClientResult, EdenFetch, QueryClient } from './types'

function queryKey(method: string, path: string | number | symbol, payload?: any) {
  const payloadKey = {
    pathParams: payload?.pathParams ?? {},
    query: payload?.query ?? {},
    headers: payload?.headers ?? {},
  }
  return [method, path, payloadKey] as const
}

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
    useQuery: function (path: any, payload: any, options?: any) {
      return useQuery({
        queryKey: queryKey('get', path, payload),
        queryFn: () => makeRequest('get', path, payload),
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
    queryOptions: function (path: any, payload: any, options?: any) {
      return {
        queryKey: queryKey('get', path, payload),
        queryFn: () => makeRequest('get', path, payload),
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

export function createReactQueryClient<T extends Elysia<any, any, any, any, any, any, any>>(
  server: string,
  options?: EdenFetch.Config
): CreateReactQueryClientResult<T> {
  const fetchClient: any = edenFetch<T>(server, options)
  const queryClient: any = createQueryClient(fetchClient)

  return { fetchClient, queryClient }
}
