import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err, ok } from 'neverthrow'
import { afterEach, describe, expect, test, vi } from 'vitest'

import type { PlatformUserLookupRepository } from './user-lookup-repository'
import { PlatformUserLookupService } from './user-lookup-service'

const createFakeRepository = () => ({
  findByPhoneNumber: vi.fn().mockResolvedValue(ok(null)),
})

const makeService = (repository = createFakeRepository()) => ({
  service: new PlatformUserLookupService(repository as unknown as PlatformUserLookupRepository),
  repository,
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('PlatformUserLookupService.lookupByPhoneNumber', () => {
  test('returns the PPLE ID sub and full name for a matching number', async () => {
    const { service, repository } = makeService()
    repository.findByPhoneNumber.mockResolvedValue(ok({ id: 'user-sub-1', name: 'สมชาย ใจดี' }))

    const result = await service.lookupByPhoneNumber('+66812345678')

    // The full name goes back deliberately: pple-platform masks it before the
    // Owner sees it, so masking is the caller's job, not ours.
    expect(result._unsafeUnwrap()).toEqual({ sub: 'user-sub-1', name: 'สมชาย ใจดี' })
  })

  test('accepts the domestic 0-prefixed format and matches on its E.164 form', async () => {
    const { service, repository } = makeService()
    repository.findByPhoneNumber.mockResolvedValue(ok({ id: 'user-sub-1', name: 'สมชาย ใจดี' }))

    await service.lookupByPhoneNumber('0812345678')

    expect(repository.findByPhoneNumber).toHaveBeenCalledWith('+66812345678')
  })

  test('reports a complete but unknown number as not found', async () => {
    const { service } = makeService()

    const result = await service.lookupByPhoneNumber('+66899999999')

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.USER_NOT_FOUND)
  })

  // The hard privacy constraint from PPLEThai/pple-platform#40: a partial number
  // must never behave like a search. A prefix is rejected before it reaches the
  // repository at all, so there is no query that could return candidates.
  test.each([
    ['a short prefix', '+66812'],
    ['a prefix one digit short', '+6681234567'],
    ['a domestic prefix', '081234'],
    ['an empty string', ''],
    ['a bare country code', '+66'],
  ])('does not search on %s', async (_label, partial) => {
    const { service, repository } = makeService()

    const result = await service.lookupByPhoneNumber(partial)

    expect(repository.findByPhoneNumber).not.toHaveBeenCalled()
    // Reported as a plain miss, identically to an unknown-but-complete number:
    // a distinct "malformed" error would tell a caller which of its guesses were
    // well-formed, which is the first rung of an enumeration ladder.
    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.USER_NOT_FOUND)
  })

  test('rejects an over-long number without searching', async () => {
    const { service, repository } = makeService()

    const result = await service.lookupByPhoneNumber('+6681234567890')

    expect(repository.findByPhoneNumber).not.toHaveBeenCalled()
    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.USER_NOT_FOUND)
  })

  test('propagates a repository failure instead of reporting a miss', async () => {
    const { service, repository } = makeService()
    repository.findByPhoneNumber.mockResolvedValue(
      err({ code: InternalErrorCode.INTERNAL_SERVER_ERROR, message: 'connection lost' })
    )

    const result = await service.lookupByPhoneNumber('+66812345678')

    expect(result._unsafeUnwrapErr().code).not.toBe(InternalErrorCode.USER_NOT_FOUND)
  })

  test('does not echo the looked-up number back in the not-found message', async () => {
    const { service } = makeService()

    const result = await service.lookupByPhoneNumber('+66899999999')

    expect(result._unsafeUnwrapErr().message).not.toContain('66899999999')
  })
})
