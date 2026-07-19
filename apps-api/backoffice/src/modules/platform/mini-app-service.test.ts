import { InternalErrorCode } from '@pple-today/api-common/dtos'
import {
  MiniApp as MiniAppModel,
  MiniAppRole,
  MiniAppSource,
  MiniAppTier,
} from '@pple-today/database/prisma'
import { err, ok } from 'neverthrow'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { PlatformMiniAppRepository } from './mini-app-repository'
import { PlatformMiniAppService } from './mini-app-service'

import type { MiniAppListCache } from '../../plugins/mini-app-cache'
import type { ZitadelService } from '../admin/zitadel/services'

/**
 * A mini-app row as the repository returns it (with roles). Overridable so each
 * test states only the fields it cares about.
 */
const makeRow = (
  overrides: Partial<MiniAppModel & { miniAppRoles: MiniAppRole[] }> = {}
): MiniAppModel & { miniAppRoles: MiniAppRole[] } =>
  ({
    id: 'app-1',
    slug: 'my-app',
    name: 'My App',
    icon: null,
    order: 0,
    clientId: 'client-1',
    clientUrl: 'https://my-app.ppleth.ai',
    requiresAuth: true,
    tier: MiniAppTier.DRAFT,
    source: MiniAppSource.PLATFORM,
    ownerSub: 'owner-sub',
    zitadelAppId: 'zitadel-app-1',
    retiredAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    miniAppRoles: [],
    ...overrides,
  }) as MiniAppModel & { miniAppRoles: MiniAppRole[] }

const createFakeRepository = () => ({
  createMiniApp: vi.fn(),
  getMiniAppById: vi.fn(),
  updateMiniApp: vi.fn(),
  setTier: vi.fn(),
  setRoles: vi.fn(),
  retire: vi.fn(),
})

const createFakeZitadel = () => ({
  createOidcApp: vi.fn(),
  updateOidcApp: vi.fn(),
  deleteApp: vi.fn(),
})

const createFakeCache = () => ({
  invalidate: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
})

const makeService = (
  repository = createFakeRepository(),
  zitadel = createFakeZitadel(),
  cache = createFakeCache()
) => ({
  service: new PlatformMiniAppService(
    repository as unknown as PlatformMiniAppRepository,
    zitadel as unknown as ZitadelService,
    cache as unknown as MiniAppListCache
  ),
  repository,
  zitadel,
  cache,
})

const CREATE_INPUT = {
  slug: 'my-app',
  name: 'My App',
  url: 'https://my-app.ppleth.ai',
  ownerSub: 'owner-sub',
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('PlatformMiniAppService.createMiniApp', () => {
  test('creates the Zitadel app, persists a DRAFT/PLATFORM row, and returns clientId + notification key', async () => {
    const { service, repository, zitadel, cache } = makeService()
    zitadel.createOidcApp.mockResolvedValue(
      ok({ appId: 'zitadel-app-1', clientId: 'client-1', clientSecret: null })
    )
    repository.createMiniApp.mockResolvedValue(
      ok({ miniApp: makeRow(), notificationApiKey: 'pple_notification_abc123' })
    )

    const result = await service.createMiniApp(CREATE_INPUT)

    // The provisioned app URL is the single allowed OAuth redirect URI.
    expect(zitadel.createOidcApp).toHaveBeenCalledWith({
      name: 'My App',
      redirectUris: ['https://my-app.ppleth.ai'],
    })
    // The Zitadel clientId and internal appId are handed to the repository to store.
    expect(repository.createMiniApp).toHaveBeenCalledWith({
      ...CREATE_INPUT,
      clientId: 'client-1',
      zitadelAppId: 'zitadel-app-1',
    })

    const value = result._unsafeUnwrap()
    expect(value.clientId).toBe('client-1')
    expect(value.notificationKey).toBe('pple_notification_abc123')
    expect(value.tier).toBe(MiniAppTier.DRAFT)
    // Owner sees their Draft immediately.
    expect(cache.invalidate).toHaveBeenCalledOnce()
  })

  test('short-circuits when the Zitadel app cannot be created — nothing is persisted', async () => {
    const { service, repository, zitadel, cache } = makeService()
    zitadel.createOidcApp.mockResolvedValue(
      err({ code: InternalErrorCode.ZITADEL_APP_CREATE_FAILED, message: 'boom' })
    )

    const result = await service.createMiniApp(CREATE_INPUT)

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.ZITADEL_APP_CREATE_FAILED)
    expect(repository.createMiniApp).not.toHaveBeenCalled()
    expect(cache.invalidate).not.toHaveBeenCalled()
  })

  test('maps a slug clash to a slug-exists error that names the orphaned Zitadel client', async () => {
    const { service, repository, zitadel, cache } = makeService()
    zitadel.createOidcApp.mockResolvedValue(
      ok({ appId: 'zitadel-app-1', clientId: 'client-1', clientSecret: null })
    )
    repository.createMiniApp.mockResolvedValue(
      err({ code: 'UNIQUE_CONSTRAINT_FAILED', message: 'duplicate slug' })
    )

    const result = await service.createMiniApp(CREATE_INPUT)

    const error = result._unsafeUnwrapErr()
    expect(error.code).toBe(InternalErrorCode.MINI_APP_SLUG_ALREADY_EXISTS)
    expect(error.message).toContain('client-1')
    expect(cache.invalidate).not.toHaveBeenCalled()
  })
})

describe('PlatformMiniAppService.updateMiniApp', () => {
  test('re-syncs the Zitadel redirect URIs when the URL changes, then persists and invalidates', async () => {
    const { service, repository, zitadel, cache } = makeService()
    repository.getMiniAppById.mockResolvedValue(ok(makeRow()))
    zitadel.updateOidcApp.mockResolvedValue(ok({}))
    repository.updateMiniApp.mockResolvedValue(
      ok(makeRow({ clientUrl: 'https://renamed.ppleth.ai' }))
    )

    const result = await service.updateMiniApp('app-1', { url: 'https://renamed.ppleth.ai' })

    expect(zitadel.updateOidcApp).toHaveBeenCalledWith('zitadel-app-1', {
      redirectUris: ['https://renamed.ppleth.ai'],
    })
    expect(repository.updateMiniApp).toHaveBeenCalledWith('app-1', {
      url: 'https://renamed.ppleth.ai',
    })
    expect(result._unsafeUnwrap().url).toBe('https://renamed.ppleth.ai')
    expect(cache.invalidate).toHaveBeenCalledOnce()
  })

  test('does not touch Zitadel when the URL is unchanged', async () => {
    const { service, repository, zitadel } = makeService()
    repository.getMiniAppById.mockResolvedValue(ok(makeRow()))
    repository.updateMiniApp.mockResolvedValue(ok(makeRow({ name: 'Renamed' })))

    await service.updateMiniApp('app-1', { name: 'Renamed' })

    expect(zitadel.updateOidcApp).not.toHaveBeenCalled()
    expect(repository.updateMiniApp).toHaveBeenCalledWith('app-1', { name: 'Renamed' })
  })

  test('leaves the row untouched when the Zitadel redirect sync fails', async () => {
    const { service, repository, zitadel, cache } = makeService()
    repository.getMiniAppById.mockResolvedValue(ok(makeRow()))
    zitadel.updateOidcApp.mockResolvedValue(
      err({ code: InternalErrorCode.ZITADEL_REQUEST_FAILED, message: 'boom' })
    )

    const result = await service.updateMiniApp('app-1', { url: 'https://renamed.ppleth.ai' })

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.ZITADEL_REQUEST_FAILED)
    expect(repository.updateMiniApp).not.toHaveBeenCalled()
    expect(cache.invalidate).not.toHaveBeenCalled()
  })

  test('returns MINI_APP_NOT_FOUND for an unknown id', async () => {
    const { service, repository, zitadel } = makeService()
    repository.getMiniAppById.mockResolvedValue(
      err({ code: 'RECORD_NOT_FOUND', message: 'not found' })
    )

    const result = await service.updateMiniApp('missing', { name: 'x' })

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_NOT_FOUND)
    expect(zitadel.updateOidcApp).not.toHaveBeenCalled()
    expect(repository.updateMiniApp).not.toHaveBeenCalled()
  })
})

describe('PlatformMiniAppService.setTier', () => {
  test('persists the tier and invalidates the list cache', async () => {
    const { service, repository, cache } = makeService()
    repository.getMiniAppById.mockResolvedValue(ok(makeRow()))
    repository.setTier.mockResolvedValue(ok(makeRow({ tier: MiniAppTier.LIVE })))

    const result = await service.setTier('app-1', MiniAppTier.LIVE)

    expect(repository.setTier).toHaveBeenCalledWith('app-1', MiniAppTier.LIVE)
    expect(result._unsafeUnwrap().tier).toBe(MiniAppTier.LIVE)
    expect(cache.invalidate).toHaveBeenCalledOnce()
  })

  test('returns MINI_APP_NOT_FOUND for an unknown id, without attempting the write', async () => {
    const { service, repository, cache } = makeService()
    // getMiniAppById is source-scoped, so an admin app (or unknown id) reports
    // not-found here — before any tier write is attempted.
    repository.getMiniAppById.mockResolvedValue(
      err({ code: 'RECORD_NOT_FOUND', message: 'not found' })
    )

    const result = await service.setTier('missing', MiniAppTier.LIVE)

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_NOT_FOUND)
    expect(repository.setTier).not.toHaveBeenCalled()
    expect(cache.invalidate).not.toHaveBeenCalled()
  })
})

describe('PlatformMiniAppService.setRoles', () => {
  test('persists the roles and invalidates the list cache', async () => {
    const { service, repository, cache } = makeService()
    repository.getMiniAppById.mockResolvedValue(ok(makeRow()))
    repository.setRoles.mockResolvedValue(
      ok(
        makeRow({
          tier: MiniAppTier.LIVE,
          miniAppRoles: [{ role: 'pple-ad:member' } as MiniAppRole],
        })
      )
    )

    const result = await service.setRoles('app-1', ['pple-ad:member'])

    expect(repository.setRoles).toHaveBeenCalledWith('app-1', ['pple-ad:member'])
    expect(result._unsafeUnwrap().roles).toEqual(['pple-ad:member'])
    expect(cache.invalidate).toHaveBeenCalledOnce()
  })

  test('returns MINI_APP_NOT_FOUND for an unknown id, without attempting the write', async () => {
    const { service, repository, cache } = makeService()
    repository.getMiniAppById.mockResolvedValue(
      err({ code: 'RECORD_NOT_FOUND', message: 'not found' })
    )

    const result = await service.setRoles('missing', [])

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_NOT_FOUND)
    expect(repository.setRoles).not.toHaveBeenCalled()
    expect(cache.invalidate).not.toHaveBeenCalled()
  })
})

describe('PlatformMiniAppService.retire', () => {
  test('deletes the Zitadel app, soft-deletes the row, and invalidates the cache', async () => {
    const { service, repository, zitadel, cache } = makeService()
    repository.getMiniAppById.mockResolvedValue(ok(makeRow()))
    zitadel.deleteApp.mockResolvedValue(ok({ message: 'deleted' }))
    repository.retire.mockResolvedValue(ok(makeRow({ retiredAt: new Date() })))

    const result = await service.retire('app-1')

    expect(zitadel.deleteApp).toHaveBeenCalledWith('zitadel-app-1')
    expect(repository.retire).toHaveBeenCalledWith('app-1')
    expect(result._unsafeUnwrap().message).toContain('retired')
    expect(cache.invalidate).toHaveBeenCalledOnce()
  })

  test('is idempotent when the Zitadel app is already gone', async () => {
    const { service, repository, zitadel } = makeService()
    repository.getMiniAppById.mockResolvedValue(ok(makeRow()))
    zitadel.deleteApp.mockResolvedValue(
      err({ code: InternalErrorCode.ZITADEL_APP_NOT_FOUND, message: 'gone' })
    )
    repository.retire.mockResolvedValue(ok(makeRow({ retiredAt: new Date() })))

    const result = await service.retire('app-1')

    expect(result.isOk()).toBe(true)
    expect(repository.retire).toHaveBeenCalledWith('app-1')
  })

  test('aborts without retiring when Zitadel deletion fails for another reason', async () => {
    const { service, repository, zitadel, cache } = makeService()
    repository.getMiniAppById.mockResolvedValue(ok(makeRow()))
    zitadel.deleteApp.mockResolvedValue(
      err({ code: InternalErrorCode.ZITADEL_REQUEST_FAILED, message: 'boom' })
    )

    const result = await service.retire('app-1')

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.ZITADEL_REQUEST_FAILED)
    expect(repository.retire).not.toHaveBeenCalled()
    expect(cache.invalidate).not.toHaveBeenCalled()
  })

  test('returns MINI_APP_NOT_FOUND for an unknown id, before touching Zitadel', async () => {
    const { service, repository, zitadel } = makeService()
    repository.getMiniAppById.mockResolvedValue(
      err({ code: 'RECORD_NOT_FOUND', message: 'not found' })
    )

    const result = await service.retire('missing')

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_NOT_FOUND)
    expect(zitadel.deleteApp).not.toHaveBeenCalled()
  })
})
