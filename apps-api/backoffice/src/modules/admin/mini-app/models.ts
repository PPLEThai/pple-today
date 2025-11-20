import { MiniApp } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const GetMiniAppsResponse = t.Array(t.Pick(MiniApp, ['id', 'name']))
export type GetMiniAppsResponse = Static<typeof GetMiniAppsResponse>

export const CreateMiniAppBody = t.Pick(MiniApp, ['name', 'slug', 'url', 'clientId', 'iconUrl'])
export type CreateMiniAppBody = Static<typeof CreateMiniAppBody>

export const CreateMiniAppResponse = t.Object({
  id: t.String({ description: 'ID of the created mini app' }),
  name: t.String({ description: 'Name of the created mini app' }),
  slug: t.String({ description: 'Slug of the created mini app' }),
  iconUrl: t.Nullable(
    t.String({
      description: 'Icon URL of the created mini app',
    })
  ),
  url: t.String({
    description: 'Client URL of the created mini app',
    format: 'uri',
  }),
  clientId: t.String({ description: 'Client ID of the created mini app' }),
})
export type CreateMiniAppResponse = Static<typeof CreateMiniAppResponse>

export const UpdateMiniAppParams = t.Object({
  id: t.String({ description: 'ID of the mini app' }),
})
export type UpdateMiniAppParams = Static<typeof UpdateMiniAppParams>

export const UpdateMiniAppBody = t.Partial(
  t.Pick(MiniApp, ['name', 'slug', 'clientId', 'url', 'iconUrl'])
)
export type UpdateMiniAppBody = Static<typeof UpdateMiniAppBody>

export const UpdateMiniAppResponse = t.Object({
  id: t.String({ description: 'ID of the created mini app' }),
  name: t.String({ description: 'Name of the created mini app' }),
  slug: t.String({ description: 'Slug of the created mini app' }),
  iconUrl: t.Nullable(
    t.String({
      description: 'Icon URL of the created mini app',
    })
  ),
  url: t.String({
    description: 'Client URL of the created mini app',
    format: 'uri',
  }),
  clientId: t.String({ description: 'Client ID of the created mini app' }),
})
export type UpdateMiniAppResponse = Static<typeof UpdateMiniAppResponse>

export const DeleteMiniAppParams = t.Object({
  id: t.String({ description: 'ID of the mini app' }),
})
export type DeleteMiniAppParams = Static<typeof DeleteMiniAppParams>

export const DeleteMiniAppResponse = t.Object({
  message: t.String({ description: 'Confirmation message of the deletion' }),
})
export type DeleteMiniAppResponse = Static<typeof DeleteMiniAppResponse>
