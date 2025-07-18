import { createReactQueryClient } from '@pple-today/api-client'

import { environment } from '@app/env'

const {
  fetchClient,
  reactQueryClient: { useQuery, useMutation, queryOptions, mutationOptions },
} = createReactQueryClient(environment.EXPO_PUBLIC_BACKEND_BASE_URL)

export { fetchClient, mutationOptions, queryOptions, useMutation, useQuery }
