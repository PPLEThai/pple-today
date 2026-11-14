import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { Check } from '@sinclair/typebox/value'
import { err, ok } from 'neverthrow'
import { describe, expect, test, vi } from 'vitest'

import {
  CONNECT_ATTEMPT_RETENTION_MS,
  redactSecrets,
  referenceCodeFromAttemptId,
  toConnectAttemptRecord,
} from './connect-attempt'
import { CreateFacebookConnectAttemptBody } from './models'
import type { FacebookRepository } from './repository'
import { FacebookService } from './services'

import type { FileServerService } from '../files/services'

// services.ts also exports an Elysia plugin, and its dependencies that boot the config graph.
vi.mock('../../plugins/file', async () => ({
  FileServicePlugin: new (await import('elysia')).default({ name: 'FileServiceStub' }),
}))
vi.mock('./repository', async () => ({
  FacebookRepositoryPlugin: new (await import('elysia')).default({ name: 'FacebookRepoStub' }),
}))
vi.mock('../../plugins/log', async () => {
  const { default: Elysia } = await import('elysia')
  return { ElysiaLoggerPlugin: () => new Elysia({ name: 'LoggerStub' }) }
})
vi.mock('../files/services', async () => ({
  FileServerServicePlugin: new (await import('elysia')).default({ name: 'FileServerStub' }),
}))

const TOKEN = 'EAAGm0PX4ZCpsBAKZCZBabcdefghijklmnop1234567890'

const body = (
  overrides: Partial<CreateFacebookConnectAttemptBody> = {}
): CreateFacebookConnectAttemptBody => ({
  attemptId: 'K7QX2MABCDEFGHJK',
  outcome: 'FAILED',
  startedAt: '2026-11-12T03:00:00.000Z',
  failedStep: 'login',
  error: { domain: 'com.facebook.sdk.login', code: '308', message: 'Login Failed' },
  context: {
    platform: 'ios',
    osVersion: '18.1',
    appVersion: '1.4.0',
    buildNumber: '120',
    facebookAppInstalled: true,
    trackingPermission: 'granted',
  },
  steps: [
    { at: 0, name: 'cached_token', data: { result: 'none' } },
    { at: 5, name: 'login_start' },
    { at: 900, name: 'login_result', data: { result: 'error', code: '308' } },
  ],
  ...overrides,
})

describe('referenceCodeFromAttemptId', () => {
  test('is the first 6 characters of the attempt id', () => {
    expect(referenceCodeFromAttemptId('K7QX2MABCDEFGHJK')).toBe('K7QX2M')
  })
})

describe('CreateFacebookConnectAttemptBody', () => {
  test('accepts a trace from the app', () => {
    expect(Check(CreateFacebookConnectAttemptBody, body())).toBe(true)
  })

  test.each(['short', 'K7QX2MABCDEFGHJ0', 'k7qx2mabcdefghjk', 'K7QX2MABCDEFGHJI'])(
    'rejects attempt id %s',
    (attemptId) => {
      expect(Check(CreateFacebookConnectAttemptBody, body({ attemptId }))).toBe(false)
    }
  )

  test('rejects more than 50 steps', () => {
    const steps = Array.from({ length: 51 }, (_, at) => ({ at, name: 'step' }))
    expect(Check(CreateFacebookConnectAttemptBody, body({ steps }))).toBe(false)
  })
})

describe('redactSecrets', () => {
  test.each([
    [`token is ${TOKEN}`, 'token is [REDACTED]'],
    [`?access_token=abc123&limit=100`, '?access_token=[REDACTED]&limit=100'],
    [`{"access_token":"abc123","id":"1"}`, '{"access_token":"[REDACTED]","id":"1"}'],
    [`{\\"pageAccessToken\\":\\"abc123\\"}`, '{\\"pageAccessToken\\":\\"[REDACTED]\\"}'],
    ['Authorization: Bearer abc.def.ghi', 'Authorization: Bearer [REDACTED]'],
  ])('redacts %s', (input, expected) => {
    expect(redactSecrets(input)).toBe(expected)
  })

  test.each([
    '{"code":190,"error_subcode":463,"fbtrace_id":"AbCdEf","message":"expired"}',
    'Error validating access token: Session has expired',
  ])('keeps error codes and ordinary text: %s', (text) => {
    expect(redactSecrets(text)).toBe(text)
  })
})

describe('toConnectAttemptRecord', () => {
  test('maps the body to a row and derives the reference code', () => {
    expect(toConnectAttemptRecord('user-1', body())).toEqual({
      id: 'K7QX2MABCDEFGHJK',
      referenceCode: 'K7QX2M',
      userId: 'user-1',
      outcome: 'FAILED',
      failedStep: 'login',
      platform: 'ios',
      osVersion: '18.1',
      appVersion: '1.4.0',
      buildNumber: '120',
      errorDomain: 'com.facebook.sdk.login',
      errorCode: '308',
      errorMessage: 'Login Failed',
      context: { facebookAppInstalled: true, trackingPermission: 'granted' },
      steps: body().steps,
      startedAt: new Date('2026-11-12T03:00:00.000Z'),
    })
  })

  test('redacts tokens a buggy client might send', () => {
    const record = toConnectAttemptRecord(
      'user-1',
      body({
        error: { message: `Invalid token ${TOKEN}` },
        steps: [{ at: 0, name: 'graph_accounts', data: { url: `?access_token=${TOKEN}` } }],
      })
    )
    expect(JSON.stringify(record)).not.toContain(TOKEN)
    expect(record.errorMessage).toBe('Invalid token [REDACTED]')
  })
})

describe('FacebookService.recordConnectAttempt', () => {
  const setup = () => {
    const repository = {
      createConnectAttempt: vi.fn().mockResolvedValue(ok({ id: 'x', referenceCode: 'K7QX2M' })),
      deleteConnectAttemptsCreatedBefore: vi.fn().mockResolvedValue(ok({ count: 2 })),
    }
    const logger = { info: vi.fn(), error: vi.fn() }
    let now = new Date('2026-11-12T03:00:00.000Z')
    const service = new FacebookService(
      repository as unknown as FacebookRepository,
      {} as FileServerService,
      logger as never,
      () => now
    )
    return { repository, logger, service, setNow: (date: Date) => (now = date) }
  }

  test('stores the attempt, logs a summary and returns the reference code', async () => {
    const { repository, logger, service } = setup()

    const result = await service.recordConnectAttempt('user-1', body())

    expect(result._unsafeUnwrap()).toEqual({ referenceCode: 'K7QX2M' })
    expect(repository.createConnectAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'K7QX2MABCDEFGHJK', userId: 'user-1' })
    )
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        facebookConnectAttempt: expect.objectContaining({
          referenceCode: 'K7QX2M',
          outcome: 'FAILED',
          errorDomain: 'com.facebook.sdk.login',
          steps: 'cached_token > login_start > login_result',
        }),
      })
    )
  })

  test('accepts a resend of an attempt it already stored', async () => {
    const { repository, service } = setup()
    repository.createConnectAttempt.mockResolvedValue(
      err({ code: 'UNIQUE_CONSTRAINT_FAILED', message: 'dup', originalError: null })
    )

    const result = await service.recordConnectAttempt('user-1', body())

    expect(result.isOk()).toBe(true)
  })

  test('rejects an oversized trace without storing it', async () => {
    const { repository, service } = setup()
    const steps = [{ at: 0, name: 'x', data: { blob: 'a'.repeat(70_000) } }]

    const result = await service.recordConnectAttempt('user-1', body({ steps }))

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.BAD_REQUEST)
    expect(repository.createConnectAttempt).not.toHaveBeenCalled()
  })

  test('deletes attempts older than 90 days at most once an hour', async () => {
    const { repository, service, setNow } = setup()

    await service.recordConnectAttempt('user-1', body())
    await service.recordConnectAttempt('user-1', body())
    expect(repository.deleteConnectAttemptsCreatedBefore).toHaveBeenCalledTimes(1)
    expect(repository.deleteConnectAttemptsCreatedBefore).toHaveBeenCalledWith(
      new Date(new Date('2026-11-12T03:00:00.000Z').getTime() - CONNECT_ATTEMPT_RETENTION_MS)
    )

    setNow(new Date('2026-11-12T04:00:00.000Z'))
    await service.recordConnectAttempt('user-1', body())
    expect(repository.deleteConnectAttemptsCreatedBefore).toHaveBeenCalledTimes(2)
  })

  test('a failed retention delete is logged, not thrown', async () => {
    const { repository, logger, service } = setup()
    repository.deleteConnectAttemptsCreatedBefore.mockResolvedValue(
      err({ code: 'UNKNOWN_ERROR', message: 'db down', originalError: null })
    )

    await expect(service.purgeExpiredConnectAttempts()).resolves.toBe(0)
    expect(logger.error).toHaveBeenCalled()
  })
})
