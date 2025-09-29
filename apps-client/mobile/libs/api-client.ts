import { createApiClient } from '@pple-today/api-client'

import type { ApplicationApiSchema } from '@api/backoffice/app'
import { environment } from '@app/env'

import { getAuthSessionAsync } from './auth/session'

const { fetchClient, reactQueryClient } = createApiClient<ApplicationApiSchema>(
  environment.EXPO_PUBLIC_BACKEND_BASE_URL
)
fetchClient.interceptors.request = async (config) => {
  const session = await getAuthSessionAsync()
  if (session) {
    config.headers = { ...config.headers, Authorization: `Bearer ${session.accessToken}` }
  }
  return config
}

export { fetchClient, reactQueryClient }
