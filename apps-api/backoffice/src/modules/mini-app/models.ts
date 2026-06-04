import { MiniApp } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const ListMiniAppsResponse = t.Array(t.Pick(MiniApp, ['slug', 'name', 'iconUrl', 'order']))
export type ListMiniAppsResponse = Static<typeof ListMiniAppsResponse>

export const ListMiniAppsQuery = t.Object({
  role: t.Optional(
    t.String({
      description:
        'Deprecated and ignored. Kept for backward compatibility with older app versions; mini apps are filtered by the active role resolved from SSO AD.',
    })
  ),
})
export type ListMiniAppsQuery = Static<typeof ListMiniAppsQuery>
