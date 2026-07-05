import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { err, ok } from 'neverthrow'

import { CreateZitadelAppInput, UpdateZitadelAppInput, ZitadelApp } from '../mini-app/models'

export interface ZitadelConfig {
  apiUrl?: string
  pat?: string
  projectId?: string
  orgId?: string
  loginV2BaseUri: string
}

interface ZitadelOidcConfig {
  clientId: string
  redirectUris?: string[]
  postLogoutRedirectUris?: string[]
  responseTypes?: string[]
  grantTypes?: string[]
  appType?: string
  authMethodType?: string
  devMode?: boolean
  loginVersion?: unknown
}

interface ZitadelAppEntry {
  id: string
  name: string
  state?: string
  oidcConfig?: ZitadelOidcConfig
}

const toZitadelAppDto = (app: ZitadelAppEntry): ZitadelApp => ({
  appId: app.id,
  name: app.name,
  clientId: app.oidcConfig?.clientId ?? '',
  redirectUris: app.oidcConfig?.redirectUris ?? [],
  postLogoutRedirectUris: app.oidcConfig?.postLogoutRedirectUris ?? [],
  appType: app.oidcConfig?.appType ?? 'OIDC_APP_TYPE_USER_AGENT',
  authMethodType: app.oidcConfig?.authMethodType ?? 'OIDC_AUTH_METHOD_TYPE_NONE',
  devMode: app.oidcConfig?.devMode ?? false,
})

export class ZitadelService {
  constructor(
    private readonly config: ZitadelConfig,
    private readonly loggerService: ElysiaLoggerInstance
  ) {}

  private requireConfig() {
    const { apiUrl, pat, projectId } = this.config
    if (!apiUrl || !pat || !projectId) {
      return err({
        code: InternalErrorCode.ZITADEL_NOT_CONFIGURED,
        message:
          'Zitadel Management API is not configured (ZITADEL_API_URL, ZITADEL_PAT, ZITADEL_PROJECT_ID are required)',
      })
    }
    return ok({ apiUrl: apiUrl.replace(/\/$/, ''), pat, projectId, orgId: this.config.orgId })
  }

  private async request(
    config: { apiUrl: string; pat: string; orgId?: string },
    method: string,
    path: string,
    body?: unknown
  ) {
    const response = await fetch(`${config.apiUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.pat}`,
        ...(config.orgId ? { 'x-zitadel-orgid': config.orgId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    const responseBody = await response.json().catch(() => null)

    if (!response.ok) {
      this.loggerService.error({
        error: responseBody,
        message: `Zitadel request ${method} ${path} failed (status ${response.status})`,
      })
      if (response.status === 404) {
        return err({
          code: InternalErrorCode.ZITADEL_APP_NOT_FOUND,
          message: 'Zitadel app not found',
        })
      }
      return err({
        code: InternalErrorCode.ZITADEL_REQUEST_FAILED,
        message: `Zitadel request failed (status ${response.status})`,
      })
    }

    return ok(responseBody)
  }

  async createOidcApp(input: { name: string } & CreateZitadelAppInput) {
    const configResult = this.requireConfig()
    if (configResult.isErr()) return err(configResult.error)
    const config = configResult.value

    const result = await this.request(
      config,
      'POST',
      `/management/v1/projects/${config.projectId}/apps/oidc`,
      {
        name: input.name,
        redirectUris: input.redirectUris,
        postLogoutRedirectUris: input.postLogoutRedirectUris ?? [],
        responseTypes: ['OIDC_RESPONSE_TYPE_CODE'],
        grantTypes: ['OIDC_GRANT_TYPE_AUTHORIZATION_CODE'],
        appType: input.appType ?? 'OIDC_APP_TYPE_USER_AGENT',
        authMethodType: input.authMethodType ?? 'OIDC_AUTH_METHOD_TYPE_NONE',
        devMode: input.devMode ?? false,
        loginVersion: { loginV2: { baseUri: this.config.loginV2BaseUri } },
      }
    )
    if (result.isErr()) {
      return err({
        code: InternalErrorCode.ZITADEL_APP_CREATE_FAILED,
        message: `Failed to create Zitadel OIDC app "${input.name}"`,
      })
    }

    const body = result.value
    if (!body?.clientId) {
      this.loggerService.error({
        error: body,
        message: `Unexpected Zitadel response creating OIDC app "${input.name}"`,
      })
      return err({
        code: InternalErrorCode.ZITADEL_APP_CREATE_FAILED,
        message: 'Unexpected response from Zitadel while creating the OIDC app',
      })
    }

    return ok({
      appId: body.appId as string,
      clientId: body.clientId as string,
      clientSecret: (body.clientSecret as string | undefined) ?? null,
    })
  }

  async listOidcApps() {
    const configResult = this.requireConfig()
    if (configResult.isErr()) return err(configResult.error)
    const config = configResult.value

    const result = await this.request(
      config,
      'POST',
      `/management/v1/projects/${config.projectId}/apps/_search`,
      { query: { limit: 1000 } }
    )
    if (result.isErr()) return err(result.error)

    const apps = ((result.value?.result ?? []) as ZitadelAppEntry[]).filter((app) => app.oidcConfig)
    return ok(apps.map(toZitadelAppDto))
  }

  private async getOidcAppEntry(
    config: { apiUrl: string; pat: string; projectId: string; orgId?: string },
    appId: string
  ) {
    const result = await this.request(
      config,
      'GET',
      `/management/v1/projects/${config.projectId}/apps/${appId}`
    )
    if (result.isErr()) return err(result.error)

    const app = result.value?.app as ZitadelAppEntry | undefined
    if (!app?.oidcConfig) {
      return err({
        code: InternalErrorCode.ZITADEL_APP_NOT_FOUND,
        message: 'Zitadel app not found or is not an OIDC app',
      })
    }
    return ok(app)
  }

  async updateOidcApp(appId: string, input: UpdateZitadelAppInput) {
    const configResult = this.requireConfig()
    if (configResult.isErr()) return err(configResult.error)
    const config = configResult.value

    const existingResult = await this.getOidcAppEntry(config, appId)
    if (existingResult.isErr()) return err(existingResult.error)
    const existing = existingResult.value
    const existingConfig = existing.oidcConfig!

    if (input.name !== undefined && input.name !== existing.name) {
      const renameResult = await this.request(
        config,
        'PUT',
        `/management/v1/projects/${config.projectId}/apps/${appId}`,
        { name: input.name }
      )
      if (renameResult.isErr()) return err(renameResult.error)
    }

    const hasConfigChanges =
      input.redirectUris !== undefined ||
      input.postLogoutRedirectUris !== undefined ||
      input.appType !== undefined ||
      input.authMethodType !== undefined ||
      input.devMode !== undefined

    if (!hasConfigChanges) {
      const refreshedResult = await this.getOidcAppEntry(config, appId)
      if (refreshedResult.isErr()) return err(refreshedResult.error)
      return ok(toZitadelAppDto(refreshedResult.value))
    }

    // The OIDC config update endpoint replaces the whole config, so merge the
    // requested changes over the existing values.
    const updateConfigResult = await this.request(
      config,
      'PUT',
      `/management/v1/projects/${config.projectId}/apps/${appId}/oidc_config`,
      {
        redirectUris: input.redirectUris ?? existingConfig.redirectUris ?? [],
        postLogoutRedirectUris:
          input.postLogoutRedirectUris ?? existingConfig.postLogoutRedirectUris ?? [],
        responseTypes: existingConfig.responseTypes ?? ['OIDC_RESPONSE_TYPE_CODE'],
        grantTypes: existingConfig.grantTypes ?? ['OIDC_GRANT_TYPE_AUTHORIZATION_CODE'],
        appType: input.appType ?? existingConfig.appType ?? 'OIDC_APP_TYPE_USER_AGENT',
        authMethodType:
          input.authMethodType ?? existingConfig.authMethodType ?? 'OIDC_AUTH_METHOD_TYPE_NONE',
        devMode: input.devMode ?? existingConfig.devMode ?? false,
        loginVersion: existingConfig.loginVersion ?? {
          loginV2: { baseUri: this.config.loginV2BaseUri },
        },
      }
    )
    if (updateConfigResult.isErr()) return err(updateConfigResult.error)

    const refreshedResult = await this.getOidcAppEntry(config, appId)
    if (refreshedResult.isErr()) return err(refreshedResult.error)

    return ok(toZitadelAppDto(refreshedResult.value))
  }

  async deleteApp(appId: string) {
    const configResult = this.requireConfig()
    if (configResult.isErr()) return err(configResult.error)
    const config = configResult.value

    const result = await this.request(
      config,
      'DELETE',
      `/management/v1/projects/${config.projectId}/apps/${appId}`
    )
    if (result.isErr()) return err(result.error)

    return ok({ message: 'Zitadel app deleted successfully' })
  }
}
