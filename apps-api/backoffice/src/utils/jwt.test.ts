import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { generateKeyPairSync } from 'crypto'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  introspectAccessToken,
  INTROSPECTION_CACHE_TTL_MS,
  resetIntrospectionCache,
  SSO_REQUEST_TIMEOUT_MS,
} from './jwt'

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })

const config = {
  oidcClientId: 'client-id',
  oidcUrl: 'https://id.example.com',
  oidcPrivateJwtKey: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  oidcKeyId: 'key-id',
}

const nowSeconds = () => Math.floor(Date.now() / 1000)

const activeIntrospection = (overrides: Record<string, unknown> = {}) => ({
  active: true,
  scope: 'openid profile phone',
  client_id: 'client-id',
  token_type: 'Bearer',
  exp: nowSeconds() + 3600,
  iat: nowSeconds(),
  nbf: nowSeconds(),
  sub: 'user-1',
  aud: ['client-id'],
  iss: 'https://id.example.com',
  jti: 'jti-1',
  username: 'user@example.com',
  name: 'Test User',
  given_name: 'Test',
  family_name: 'User',
  locale: null,
  updated_at: nowSeconds(),
  preferred_username: '+66800000000@example.com',
  phone_number: '+66800000000',
  phone_number_verified: true,
  pple_roles: ['pple-user'],
  ...overrides,
})

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

beforeEach(() => {
  resetIntrospectionCache()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('introspectAccessToken', () => {
  test('reuses a recent answer for the same token', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => jsonResponse(activeIntrospection()))

    const first = await introspectAccessToken('token-a', config)
    const second = await introspectAccessToken('token-a', config)

    expect(first._unsafeUnwrap().sub).toBe('user-1')
    expect(second._unsafeUnwrap().sub).toBe('user-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('shares one SSO call between concurrent requests with the same token', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => jsonResponse(activeIntrospection()))

    const results = await Promise.all(
      Array.from({ length: 10 }, () => introspectAccessToken('token-a', config))
    )

    expect(results.every((result) => result.isOk())).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('introspects each distinct token separately', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => jsonResponse(activeIntrospection()))

    await introspectAccessToken('token-a', config)
    await introspectAccessToken('token-b', config)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('asks the SSO again once the TTL has passed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => jsonResponse(activeIntrospection()))

    await introspectAccessToken('token-a', config)
    vi.setSystemTime(Date.now() + INTROSPECTION_CACHE_TTL_MS + 1)
    await introspectAccessToken('token-a', config)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('never keeps an answer past the token expiry', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => jsonResponse(activeIntrospection({ exp: nowSeconds() + 5 })))

    await introspectAccessToken('token-a', config)
    vi.setSystemTime(Date.now() + 6 * 1000)
    await introspectAccessToken('token-a', config)

    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('caches an inactive token rejection', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => jsonResponse({ active: false }))

    const first = await introspectAccessToken('expired', config)
    const second = await introspectAccessToken('expired', config)

    expect(first._unsafeUnwrapErr().code).toBe(InternalErrorCode.UNAUTHORIZED)
    expect(second._unsafeUnwrapErr().code).toBe(InternalErrorCode.UNAUTHORIZED)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('does not cache SSO errors, so the next request retries', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('bad gateway', { status: 502 }))
      .mockResolvedValueOnce(jsonResponse(activeIntrospection()))

    const first = await introspectAccessToken('token-a', config)
    const second = await introspectAccessToken('token-a', config)

    expect(first._unsafeUnwrapErr().code).toBe(InternalErrorCode.INTERNAL_SERVER_ERROR)
    expect(second.isOk()).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  test('treats an HTML body on a 200 as a bad response instead of throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<!DOCTYPE html><p>upstream error</p>', { status: 200 })
    )

    const result = await introspectAccessToken('token-a', config)

    expect(result.isErr()).toBe(true)
  })

  test('fails instead of hanging when the SSO does not answer in time', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError')
    })

    const result = await introspectAccessToken('token-a', config)

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.INTERNAL_SERVER_ERROR)
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal)
    expect(SSO_REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(5000)
  })
})
