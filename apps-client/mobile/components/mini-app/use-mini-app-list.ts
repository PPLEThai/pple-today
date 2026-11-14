import { useMemo } from 'react'

import { ExtractBodyResponse } from '@pple-today/api-client'

import { ApplicationApiSchema } from '@api/backoffice/app'
import { reactQueryClient } from '@app/libs/api-client'
import { partitionMiniApps } from '@app/utils/apps-tab'

export type MiniAppListItem = ExtractBodyResponse<ApplicationApiSchema, 'get', '/mini-app'>[number]

/**
 * The `/mini-app` list grouped by Publication Tier: the party's Live apps
 * (role-scoped), and the Beta and Draft apps the user can open.
 */
export function useMiniAppList() {
  const query = reactQueryClient.useQuery('/mini-app', { query: {} })
  const apps = useMemo(() => partitionMiniApps(query.data ?? []), [query.data])
  return { ...query, apps }
}
