import { MiniApp } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const ListMiniAppsResponse = t.Array(
  t.Pick(MiniApp, ['id', 'name', 'iconUrl', 'url', 'order'])
)
export type ListMiniAppsResponse = Static<typeof ListMiniAppsResponse>
