import { MiniApp } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const ListMiniAppsResponse = t.Array(t.Pick(MiniApp, ['slug', 'name', 'iconUrl']))
export type ListMiniAppsResponse = Static<typeof ListMiniAppsResponse>
