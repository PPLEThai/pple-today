import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { ElysiaLoggerInstance } from '@pple-today/api-common/plugins'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { ZitadelService } from './zitadel-service'

const loggerService = {
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
} as any as ElysiaLoggerInstance

const config = {
  apiUrl: 'https://zitadel.example.com',
  pat: 'test-pat',
  projectId: 'project-123',
  orgId: 'org-456',
  loginV2BaseUri: 'https://login.example.com/',
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ZitadelService.createOidcApp', () => {
  test('creates an OIDC app with login v2 and returns client credentials', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ appId: 'app-1', clientId: 'client-1' }), { status: 200 })
      )

    const service = new ZitadelService(config, loggerService)
    const result = await service.createOidcApp({
      name: 'My Mini App',
      redirectUris: ['https://mini.example.com/callback'],
    })

    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toEqual({
      appId: 'app-1',
      clientId: 'client-1',
      clientSecret: null,
    })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://zitadel.example.com/management/v1/projects/project-123/apps/oidc')
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer test-pat',
      'x-zitadel-orgid': 'org-456',
    })

    const body = JSON.parse(init?.body as string)
    expect(body).toMatchObject({
      name: 'My Mini App',
      redirectUris: ['https://mini.example.com/callback'],
      responseTypes: ['OIDC_RESPONSE_TYPE_CODE'],
      grantTypes: ['OIDC_GRANT_TYPE_AUTHORIZATION_CODE'],
      appType: 'OIDC_APP_TYPE_USER_AGENT',
      authMethodType: 'OIDC_AUTH_METHOD_TYPE_NONE',
      loginVersion: { loginV2: { baseUri: 'https://login.example.com/' } },
    })
  })

  test('passes through client secret for BASIC auth method', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ appId: 'app-2', clientId: 'client-2', clientSecret: 'secret-2' }),
        { status: 200 }
      )
    )

    const service = new ZitadelService(config, loggerService)
    const result = await service.createOidcApp({
      name: 'Confidential App',
      redirectUris: ['https://web.example.com/callback'],
      appType: 'OIDC_APP_TYPE_WEB',
      authMethodType: 'OIDC_AUTH_METHOD_TYPE_BASIC',
    })

    expect(result._unsafeUnwrap().clientSecret).toBe('secret-2')
  })

  test('returns ZITADEL_NOT_CONFIGURED when credentials are missing', async () => {
    const service = new ZitadelService(
      { loginV2BaseUri: 'https://login.example.com/' },
      loggerService
    )
    const result = await service.createOidcApp({
      name: 'My Mini App',
      redirectUris: ['https://mini.example.com/callback'],
    })

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.ZITADEL_NOT_CONFIGURED)
  })

  test('returns ZITADEL_APP_CREATE_FAILED on API error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'permission denied' }), { status: 403 })
    )

    const service = new ZitadelService(config, loggerService)
    const result = await service.createOidcApp({
      name: 'My Mini App',
      redirectUris: ['https://mini.example.com/callback'],
    })

    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.ZITADEL_APP_CREATE_FAILED)
  })
})
