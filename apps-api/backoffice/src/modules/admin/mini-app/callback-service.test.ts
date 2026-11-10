import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { MiniAppSource } from '@pple-today/database/prisma'
import { ok } from 'neverthrow'
import { describe, expect, test, vi } from 'vitest'

import { AdminMiniAppCallbackService } from './callback-service'
import type { AdminMiniAppRepository } from './repository'

import {
  CallbackHttpClient,
  NotificationCallbackSender,
} from '../../notification/callback-delivery'
import { decryptCallbackSecret, encryptCallbackSecret } from '../../notification/callback-secret'

const KEY = 'k'
const publicLookup = async () => [{ address: '93.184.216.34', family: 4 as const }]

const NOW = new Date('2026-11-10T00:00:00Z')

const setup = (
  app: {
    source?: MiniAppSource
    url?: string | null
    secret?: string | null
    previousSecret?: string | null
    previousExpiresAt?: Date | null
  } = {}
) => {
  const stored = {
    slug: 'leave',
    source: app.source ?? MiniAppSource.ADMIN,
    notificationCallbackUrl: app.url === undefined ? null : app.url,
    notificationCallbackSecret: app.secret === undefined ? null : app.secret,
    notificationCallbackPreviousSecret: app.previousSecret ?? null,
    notificationCallbackPreviousSecretExpiresAt: app.previousExpiresAt ?? null,
  }
  const repository = {
    findCallbackSettings: vi.fn().mockResolvedValue(ok(stored)),
    setCallbackSettings: vi.fn().mockResolvedValue(ok({})),
  } as unknown as AdminMiniAppRepository & {
    findCallbackSettings: ReturnType<typeof vi.fn>
    setCallbackSettings: ReturnType<typeof vi.fn>
  }
  const post = vi.fn<CallbackHttpClient['post']>().mockResolvedValue({ statusCode: 200 })
  const sender = new NotificationCallbackSender({ secretKey: KEY }, { post }, publicLookup)
  const service = new AdminMiniAppCallbackService(repository, sender, KEY, publicLookup, () => NOW)
  return { service, repository, post }
}

describe('AdminMiniAppCallbackService.setUrl', () => {
  test('first set generates an encrypted secret and reveals it once', async () => {
    const { service, repository } = setup()
    const r = await service.setUrl('app-1', 'https://hooks.example.com/pple')
    expect(r.isOk()).toBe(true)
    const value = r._unsafeUnwrap()
    expect(value.secret).toMatch(/^whsec_/)

    const saved = repository.setCallbackSettings.mock.calls[0][1]
    expect(saved.notificationCallbackUrl).toBe('https://hooks.example.com/pple')
    expect(saved.notificationCallbackSecret).not.toContain(value.secret!)
    expect(decryptCallbackSecret(saved.notificationCallbackSecret, KEY)).toBe(value.secret)
  })

  test('changing the URL later keeps the secret and does not reveal it again', async () => {
    const { service, repository } = setup({
      url: 'https://old.example.com/',
      secret: encryptCallbackSecret('whsec_old', KEY),
    })
    const r = await service.setUrl('app-1', 'https://new.example.com/')
    expect(r._unsafeUnwrap().secret).toBeNull()
    expect(repository.setCallbackSettings.mock.calls[0][1]).toEqual({
      notificationCallbackUrl: 'https://new.example.com/',
    })
  })

  test.each([
    'http://hooks.example.com/',
    'https://127.0.0.1/',
    'https://localhost/x',
    'https://169.254.169.254/',
    'nonsense',
  ])('refuses %s', async (url) => {
    const { service, repository } = setup()
    const r = await service.setUrl('app-1', url)
    expect(r._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_CALLBACK_URL_INVALID)
    expect(repository.setCallbackSettings).not.toHaveBeenCalled()
  })

  test('refuses a host that resolves to a private address', async () => {
    const { repository } = setup()
    const sender = new NotificationCallbackSender({ secretKey: KEY })
    const service = new AdminMiniAppCallbackService(repository, sender, KEY, async () => [
      { address: '10.0.0.7', family: 4 },
    ])
    const r = await service.setUrl('app-1', 'https://internal-lookalike.example.com/')
    expect(r._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_CALLBACK_URL_INVALID)
  })

  test('refuses PLATFORM apps', async () => {
    const { service } = setup({ source: MiniAppSource.PLATFORM })
    const r = await service.setUrl('app-1', 'https://hooks.example.com/')
    expect(r._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_PLATFORM_MANAGED)
  })

  test('fails loudly without the encryption key rather than storing plaintext', async () => {
    const { repository } = setup()
    const service = new AdminMiniAppCallbackService(
      repository,
      new NotificationCallbackSender({}),
      undefined,
      publicLookup
    )
    const r = await service.setUrl('app-1', 'https://hooks.example.com/')
    expect(r._unsafeUnwrapErr().code).toBe(InternalErrorCode.INTERNAL_SERVER_ERROR)
  })
})

describe('AdminMiniAppCallbackService.get / clear', () => {
  test('get reports the URL and whether a secret exists, never the secret', async () => {
    const { service } = setup({ url: 'https://a.example.com/', secret: 'enc' })
    expect(await service.get('app-1')).toEqual(
      ok({ url: 'https://a.example.com/', hasSecret: true })
    )
  })

  test('clear removes URL and secret together', async () => {
    const { service, repository } = setup({ url: 'https://a.example.com/', secret: 'enc' })
    await service.clear('app-1')
    expect(repository.setCallbackSettings).toHaveBeenCalledWith('app-1', {
      notificationCallbackUrl: null,
      notificationCallbackSecret: null,
      notificationCallbackPreviousSecret: null,
      notificationCallbackPreviousSecretExpiresAt: null,
    })
  })
})

describe('AdminMiniAppCallbackService.rotateSecret', () => {
  test('stores a new encrypted secret and returns it once', async () => {
    const old = encryptCallbackSecret('whsec_old', KEY)
    const { service, repository } = setup({ url: 'https://a.example.com/', secret: old })
    const { secret } = (await service.rotateSecret('app-1'))._unsafeUnwrap()
    expect(secret).not.toBe('whsec_old')
    const saved = repository.setCallbackSettings.mock.calls[0][1]
    expect(saved.notificationCallbackSecret).not.toBe(old)
    expect(decryptCallbackSecret(saved.notificationCallbackSecret, KEY)).toBe(secret)
  })

  test('moves the old secret to the previous slot for 24 hours', async () => {
    const old = encryptCallbackSecret('whsec_old', KEY)
    const { service, repository } = setup({ url: 'https://a.example.com/', secret: old })
    await service.rotateSecret('app-1')
    const saved = repository.setCallbackSettings.mock.calls[0][1]
    expect(saved.notificationCallbackPreviousSecret).toBe(old)
    expect(saved.notificationCallbackPreviousSecretExpiresAt).toEqual(
      new Date(NOW.getTime() + 24 * 3_600_000)
    )
  })

  test('a second rotation replaces the previous slot with the then-current secret', async () => {
    const current = encryptCallbackSecret('whsec_cur', KEY)
    const { service, repository } = setup({
      url: 'https://a.example.com/',
      secret: current,
      previousSecret: encryptCallbackSecret('whsec_older', KEY),
      previousExpiresAt: new Date(NOW.getTime() + 1000),
    })
    await service.rotateSecret('app-1')
    expect(repository.setCallbackSettings.mock.calls[0][1].notificationCallbackPreviousSecret).toBe(
      current
    )
  })

  test('needs a URL first', async () => {
    const { service } = setup()
    expect((await service.rotateSecret('app-1'))._unsafeUnwrapErr().code).toBe(
      InternalErrorCode.MINI_APP_CALLBACK_NOT_CONFIGURED
    )
  })
})

describe('AdminMiniAppCallbackService.sendTestEvent', () => {
  const configured = () =>
    setup({
      url: 'https://hooks.example.com/pple',
      secret: encryptCallbackSecret('whsec_x', KEY),
    })

  test('returns the receiver status code', async () => {
    const { service, post } = configured()
    post.mockResolvedValue({ statusCode: 401 })
    expect((await service.sendTestEvent('app-1'))._unsafeUnwrap()).toEqual({
      statusCode: 401,
      error: null,
    })
    expect(post.mock.calls[0][0].headers['X-PPLE-Event']).toBe('notification.test')
  })

  test('the test event is signed with both secrets during the grace window', async () => {
    const { service, post } = setup({
      url: 'https://hooks.example.com/pple',
      secret: encryptCallbackSecret('whsec_new', KEY),
      previousSecret: encryptCallbackSecret('whsec_old', KEY),
      previousExpiresAt: new Date(Date.now() + 3_600_000),
    })
    await service.sendTestEvent('app-1')
    expect(post.mock.calls[0][0].headers['X-PPLE-Signature']).toMatch(
      /^v1=[0-9a-f]{64},v1=[0-9a-f]{64}$/
    )
  })

  test('reports a transport error without a status', async () => {
    const { service, post } = configured()
    post.mockResolvedValue({ error: 'timeout after 10000ms' })
    expect((await service.sendTestEvent('app-1'))._unsafeUnwrap()).toEqual({
      statusCode: null,
      error: 'timeout after 10000ms',
    })
  })

  test('needs a URL first', async () => {
    const { service } = setup()
    expect((await service.sendTestEvent('app-1'))._unsafeUnwrapErr().code).toBe(
      InternalErrorCode.MINI_APP_CALLBACK_NOT_CONFIGURED
    )
  })
})
