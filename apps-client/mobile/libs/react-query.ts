import { createReactQueryClient } from '@pple-today/api-client'

import type { ApplicationApiSchema } from '@api/backoffice'
import { environment } from '@app/env'

import { getAuthSession } from './auth/session'

const { fetchClient, queryClient } = createReactQueryClient<ApplicationApiSchema>(
  environment.EXPO_PUBLIC_BACKEND_BASE_URL
)
fetchClient.interceptors.request = async (config) => {
  const session = await getAuthSession()
  if (session) {
    config.headers = { ...config.headers, Authorization: `Bearer ${session.accessToken}` }
  }
  return config
}

export { fetchClient, queryClient }
