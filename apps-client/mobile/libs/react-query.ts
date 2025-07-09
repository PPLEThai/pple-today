import { createReactQueryClient } from '@pple-today/api-client'

const {
  fetchClient,
  reactQueryClient: { useQuery, useMutation, queryOptions, mutationOptions },
} = createReactQueryClient('http://192.168.1.5:2000', {})

export { fetchClient, mutationOptions, queryOptions, useMutation, useQuery }
