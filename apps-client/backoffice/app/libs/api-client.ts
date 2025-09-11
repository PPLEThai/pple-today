import { createApiClient } from '@pple-today/api-client'

import type { AdminApiSchema } from '@api/backoffice/admin'

import { clientEnv } from '~/config/clientEnv'

export const { fetchClient, reactQueryClient } = createApiClient<AdminApiSchema>(clientEnv.API_URL)
