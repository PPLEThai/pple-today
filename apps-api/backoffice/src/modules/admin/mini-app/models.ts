import { MiniApp } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const GetMiniAppsResponse = t.Array(t.Pick(MiniApp, ['id', 'name']))
export type GetMiniAppsResponse = Static<typeof GetMiniAppsResponse>
