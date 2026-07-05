import { InternalErrorCode, MiniApp } from '@pple-today/api-common/dtos'
import { mapRepositoryError } from '@pple-today/api-common/utils'
import { MiniApp as MiniAppModel, MiniAppRole } from '@pple-today/database/prisma'
import { Check } from '@sinclair/typebox/value'
import Elysia, { t } from 'elysia'
import { err, ok } from 'neverthrow'

import {
  CreateMiniAppBody,
  CreateZitadelAppBody,
  GetMiniAppsResponse,
  GetRoleOptionsResponse,
  UpdateMiniAppBody,
  UpdateZitadelAppInput,
} from './models'
import { AdminMiniAppRepository, AdminMiniAppRepositoryPlugin } from './repository'

import { AD_ROLE_PREFIX, MAIN_AD_ROLE_LABELS } from '../../../constants/roles'
import { ConfigServicePlugin } from '../../../plugins/config'
import { MiniAppListCache, MiniAppListCachePlugin } from '../../../plugins/mini-app-cache'
import { ZitadelService, ZitadelServicePlugin } from '../zitadel/services'

/** Shape of the AD role options API response (labels/values without prefix). */
const RawRoleOptions = t.Object({
  ok: t.Boolean(),
  data: t.Array(t.Object({ label: t.String(), value: t.String() })),
})

const toMiniAppDto = (miniApp: MiniAppModel & { miniAppRoles: MiniAppRole[] }): MiniApp => ({
  id: miniApp.id,
  name: miniApp.name,
  slug: miniApp.slug,
  iconUrl: miniApp.icon,
  url: miniApp.clientUrl,
  clientId: miniApp.clientId,
  requiresAuth: miniApp.requiresAuth,
  order: miniApp.order,
  roles: miniApp.miniAppRoles.map(({ role }) => role),
})

export class AdminMiniAppService {
  constructor(
    private readonly adminMiniAppRepository: AdminMiniAppRepository,
    private readonly miniAppListCache: MiniAppListCache,
    private readonly zitadelService: ZitadelService,
    private readonly serviceConfig: {
      defaultMiniAppClientId?: string
      adRoleOptionsUrl?: string
      adRoleOptionsToken?: string
    } = {}
  ) {}

  async getMiniApps() {
    const result = await this.adminMiniAppRepository.getMiniApps()
    if (result.isErr()) return mapRepositoryError(result.error)

    return ok(result.value.map(toMiniAppDto) satisfies GetMiniAppsResponse)
  }

  async createMiniApp(data: CreateMiniAppBody) {
    let clientId = data.clientId

    if (data.createZitadelApp) {
      const zitadelResult = await this.zitadelService.createOidcApp({
        name: data.name,
        ...data.createZitadelApp,
      })
      if (zitadelResult.isErr()) return err(zitadelResult.error)
      clientId = zitadelResult.value.clientId
    } else if (!clientId && data.requiresAuth === false) {
      clientId = this.serviceConfig.defaultMiniAppClientId
    }

    if (!clientId) {
      return err({
        code: InternalErrorCode.MINI_APP_CLIENT_ID_REQUIRED,
        message:
          'Provide a clientId, request a Zitadel app to be created, or mark the mini app as not requiring auth (with DEFAULT_MINI_APP_CLIENT_ID configured)',
      })
    }

    const createResult = await this.adminMiniAppRepository.createMiniApp({ ...data, clientId })
    if (createResult.isErr())
      return mapRepositoryError(createResult.error, {
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.MINI_APP_SLUG_ALREADY_EXISTS,
          message: data.createZitadelApp
            ? `Mini app with the given slug already exists. Note: a Zitadel app was already created with clientId "${clientId}" — reuse it or clean it up in Zitadel.`
            : 'Mini app with the given slug already exists',
        },
        ...(data.createZitadelApp
          ? {
              INTERNAL_SERVER_ERROR: `Failed to create mini app. Note: a Zitadel app was already created with clientId "${clientId}" — reuse it or clean it up in Zitadel.`,
            }
          : {}),
      })

    this.miniAppListCache.invalidate()

    return ok(toMiniAppDto(createResult.value))
  }

  async updateMiniApp(id: string, data: UpdateMiniAppBody) {
    const updateResult = await this.adminMiniAppRepository.updateMiniApp(id, data)
    if (updateResult.isErr())
      return mapRepositoryError(updateResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.MINI_APP_NOT_FOUND,
          message: 'Mini app with the given ID does not exist',
        },
        UNIQUE_CONSTRAINT_FAILED: {
          code: InternalErrorCode.MINI_APP_SLUG_ALREADY_EXISTS,
          message: 'Mini app with the given slug already exists',
        },
      })

    this.miniAppListCache.invalidate()

    return ok(toMiniAppDto(updateResult.value))
  }

  async deleteMiniApp(id: string) {
    const deleteResult = await this.adminMiniAppRepository.deleteMiniApp(id)
    if (deleteResult.isErr())
      return mapRepositoryError(deleteResult.error, {
        RECORD_NOT_FOUND: {
          code: InternalErrorCode.MINI_APP_NOT_FOUND,
          message: 'Mini app with the given ID does not exist',
        },
      })

    this.miniAppListCache.invalidate()

    return ok(deleteResult.value)
  }

  async createZitadelApp(data: CreateZitadelAppBody) {
    return this.zitadelService.createOidcApp(data)
  }

  async getZitadelApps() {
    return this.zitadelService.listOidcApps()
  }

  async updateZitadelApp(appId: string, data: UpdateZitadelAppInput) {
    return this.zitadelService.updateOidcApp(appId, data)
  }

  async deleteZitadelApp(appId: string) {
    return this.zitadelService.deleteApp(appId)
  }

  async getRoleOptions() {
    const mainRoleOptions = Object.entries(MAIN_AD_ROLE_LABELS).map(([value, label]) => ({
      label,
      value: `${AD_ROLE_PREFIX}${value}`,
    }))

    if (!this.serviceConfig.adRoleOptionsUrl || !this.serviceConfig.adRoleOptionsToken) {
      return ok(mainRoleOptions satisfies GetRoleOptionsResponse)
    }

    const response = await fetch(this.serviceConfig.adRoleOptionsUrl, {
      headers: { Authorization: `Bearer ${this.serviceConfig.adRoleOptionsToken}` },
    })
    const body = await response.json().catch(() => null)

    if (!response.ok || !Check(RawRoleOptions, body)) {
      return err({
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An error occurred while fetching the AD role options',
      })
    }

    const extraRoleOptions = body.data.map((option) => ({
      label: option.label,
      value: `${AD_ROLE_PREFIX}${option.value}`,
    }))

    return ok([...mainRoleOptions, ...extraRoleOptions] satisfies GetRoleOptionsResponse)
  }
}

export const AdminMiniAppServicePlugin = new Elysia({
  name: 'AdminMiniAppService',
})
  .use([
    AdminMiniAppRepositoryPlugin,
    MiniAppListCachePlugin,
    ZitadelServicePlugin,
    ConfigServicePlugin,
  ])
  .decorate(({ adminMiniAppRepository, miniAppListCache, zitadelService, configService }) => ({
    adminMiniAppService: new AdminMiniAppService(
      adminMiniAppRepository,
      miniAppListCache,
      zitadelService,
      {
        defaultMiniAppClientId: configService.get('DEFAULT_MINI_APP_CLIENT_ID'),
        adRoleOptionsUrl: configService.get('AD_ROLE_OPTIONS_URL'),
        adRoleOptionsToken: configService.get('SSO_INTERNAL_TOKEN'),
      }
    ),
  }))
