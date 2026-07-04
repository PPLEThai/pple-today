import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { err, ok } from 'neverthrow'

import { CreateZitadelAppInput } from '../mini-app/models'

export interface ZitadelConfig {
  apiUrl?: string
  pat?: string
  projectId?: string
  orgId?: string
  loginV2BaseUri: string
}

export class ZitadelService {
  constructor(
    private readonly config: ZitadelConfig,
    private readonly loggerService: ElysiaLoggerInstance
  ) {}

  async createOidcApp(input: { name: string } & CreateZitadelAppInput) {
    const { apiUrl, pat, projectId, orgId } = this.config
    if (!apiUrl || !pat || !projectId) {
      return err({
        code: InternalErrorCode.ZITADEL_NOT_CONFIGURED,
        message:
          'Zitadel Management API is not configured (ZITADEL_API_URL, ZITADEL_PAT, ZITADEL_PROJECT_ID are required)',
      })
    }

    const response = await fetch(
      `${apiUrl.replace(/\/$/, '')}/management/v1/projects/${projectId}/apps/oidc`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${pat}`,
          ...(orgId ? { 'x-zitadel-orgid': orgId } : {}),
        },
        body: JSON.stringify({
          name: input.name,
          redirectUris: input.redirectUris,
          postLogoutRedirectUris: input.postLogoutRedirectUris ?? [],
          responseTypes: ['OIDC_RESPONSE_TYPE_CODE'],
          grantTypes: ['OIDC_GRANT_TYPE_AUTHORIZATION_CODE'],
          appType: input.appType ?? 'OIDC_APP_TYPE_USER_AGENT',
          authMethodType: input.authMethodType ?? 'OIDC_AUTH_METHOD_TYPE_NONE',
          devMode: input.devMode ?? false,
          loginVersion: { loginV2: { baseUri: this.config.loginV2BaseUri } },
        }),
      }
    )

    const body = await response.json().catch(() => null)

    if (!response.ok || !body?.clientId) {
      this.loggerService.error({
        error: body,
        message: `Failed to create Zitadel OIDC app "${input.name}" (status ${response.status})`,
      })
      return err({
        code: InternalErrorCode.ZITADEL_APP_CREATE_FAILED,
        message: `Failed to create Zitadel OIDC app (status ${response.status})`,
      })
    }

    return ok({
      appId: body.appId as string,
      clientId: body.clientId as string,
      clientSecret: (body.clientSecret as string | undefined) ?? null,
    })
  }
}
