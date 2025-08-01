import { createReactQueryClient } from '@pple-today/api-client'

import type { ApplicationApiSchema } from '@api/backoffice'
import { environment } from '@app/env'

const { fetchClient, queryClient } = createReactQueryClient<ApplicationApiSchema>(
  environment.EXPO_PUBLIC_BACKEND_BASE_URL
)

export { fetchClient, queryClient }
