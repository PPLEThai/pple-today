import { MiniApp, TemporaryFilePath } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const ZitadelOidcAppType = t.Union([
  t.Literal('OIDC_APP_TYPE_USER_AGENT'),
  t.Literal('OIDC_APP_TYPE_WEB'),
])
export type ZitadelOidcAppType = Static<typeof ZitadelOidcAppType>

export const ZitadelOidcAuthMethodType = t.Union([
  t.Literal('OIDC_AUTH_METHOD_TYPE_NONE'),
  t.Literal('OIDC_AUTH_METHOD_TYPE_BASIC'),
])
export type ZitadelOidcAuthMethodType = Static<typeof ZitadelOidcAuthMethodType>

export const CreateZitadelAppInput = t.Object({
  redirectUris: t.Array(t.String({ format: 'uri' }), {
    minItems: 1,
    description: 'Allowed OAuth redirect URIs of the app',
  }),
  postLogoutRedirectUris: t.Optional(t.Array(t.String({ format: 'uri' }))),
  appType: t.Optional(ZitadelOidcAppType),
  authMethodType: t.Optional(ZitadelOidcAuthMethodType),
  devMode: t.Optional(t.Boolean({ description: 'Allow http redirect URIs (development only)' })),
})
export type CreateZitadelAppInput = Static<typeof CreateZitadelAppInput>

export const GetMiniAppsResponse = t.Array(MiniApp)
export type GetMiniAppsResponse = Static<typeof GetMiniAppsResponse>

export const CreateMiniAppBody = t.Composite([
  t.Pick(MiniApp, ['name', 'slug', 'url', 'order']),
  t.Partial(t.Pick(MiniApp, ['roles', 'requiresAuth', 'clientId'])),
  t.Object({
    iconFilePath: t.Optional(TemporaryFilePath),
    createZitadelApp: t.Optional(CreateZitadelAppInput),
  }),
])
export type CreateMiniAppBody = Static<typeof CreateMiniAppBody>

export const CreateMiniAppResponse = MiniApp
export type CreateMiniAppResponse = Static<typeof CreateMiniAppResponse>

export const UpdateMiniAppParams = t.Object({
  id: t.String({ description: 'ID of the mini app' }),
})
export type UpdateMiniAppParams = Static<typeof UpdateMiniAppParams>

export const UpdateMiniAppBody = t.Composite([
  t.Partial(t.Pick(MiniApp, ['name', 'slug', 'clientId', 'url', 'roles', 'order', 'requiresAuth'])),
  t.Object({
    iconFilePath: t.Optional(TemporaryFilePath),
  }),
])
export type UpdateMiniAppBody = Static<typeof UpdateMiniAppBody>

export const UpdateMiniAppResponse = MiniApp
export type UpdateMiniAppResponse = Static<typeof UpdateMiniAppResponse>

export const DeleteMiniAppParams = t.Object({
  id: t.String({ description: 'ID of the mini app' }),
})
export type DeleteMiniAppParams = Static<typeof DeleteMiniAppParams>

export const DeleteMiniAppResponse = t.Object({
  message: t.String({ description: 'Confirmation message of the deletion' }),
})
export type DeleteMiniAppResponse = Static<typeof DeleteMiniAppResponse>

export const CreateZitadelAppBody = t.Composite([
  t.Object({ name: t.String({ description: 'Name of the OIDC app in Zitadel' }) }),
  CreateZitadelAppInput,
])
export type CreateZitadelAppBody = Static<typeof CreateZitadelAppBody>

export const CreateZitadelAppResponse = t.Object({
  appId: t.String({ description: 'ID of the created Zitadel app' }),
  clientId: t.String({ description: 'OIDC client ID of the created Zitadel app' }),
  clientSecret: t.Nullable(
    t.String({
      description: 'OIDC client secret (only for BASIC auth method). Shown once — store it now.',
    })
  ),
})
export type CreateZitadelAppResponse = Static<typeof CreateZitadelAppResponse>
