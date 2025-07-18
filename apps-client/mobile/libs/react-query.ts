import { createReactQueryClient } from '@pple-today/api-client'

const {
  fetchClient,
  reactQueryClient: { useQuery, useMutation, queryOptions, mutationOptions },
} = createReactQueryClient(process.env.EXPO_PUBLIC_BACKEND_BASE_URL ?? '')

export { fetchClient, mutationOptions, queryOptions, useMutation, useQuery }
