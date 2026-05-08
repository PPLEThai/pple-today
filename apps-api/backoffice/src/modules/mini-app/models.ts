import { MiniApp } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const ListMiniAppsResponse = t.Array(t.Pick(MiniApp, ['slug', 'name', 'iconUrl', 'order']))
export type ListMiniAppsResponse = Static<typeof ListMiniAppsResponse>

export const ListMiniAppsQuery = t.Object({
  role: t.Optional(t.String({ description: 'Filter mini apps by role' })),
})
export type ListMiniAppsQuery = Static<typeof ListMiniAppsQuery>
