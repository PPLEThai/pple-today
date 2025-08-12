import { createReactQueryClient } from '@pple-today/api-client'

import type { AdminApiSchema } from '@api/backoffice'

import { clientEnv } from '~/config/clientEnv'

export const { fetchClient, queryClient } = createReactQueryClient<AdminApiSchema>(
  clientEnv.API_URL
)
