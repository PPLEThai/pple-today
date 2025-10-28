import { createApiClient } from '@pple-today/api-client'

import type { AdminApiSchema } from '@api/backoffice/admin'

import { clientEnv } from '~/config/clientEnv'
import { userManager } from '~/config/oidc'

export const { fetchClient, reactQueryClient } = createApiClient<AdminApiSchema>(clientEnv.API_URL)

fetchClient.interceptors.request = async (config) => {
  const user = await userManager.getUser()
  if (user) {
    config.headers = { ...config.headers, Authorization: `Bearer ${user.access_token}` }
  }
  return config
}
