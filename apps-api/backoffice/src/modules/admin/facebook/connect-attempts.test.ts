import { PrismaService } from '@pple-today/api-common/services'
import { ok } from 'neverthrow'
import { describe, expect, test, vi } from 'vitest'

import { AdminFacebookPageRepository, phoneSearchTerm } from './repository'
import { AdminFacebookPageService } from './services'

import type { FacebookRepository } from '../../facebook/repository'

// repository.ts and services.ts also export Elysia plugins that boot the config graph.
vi.mock('../../../plugins/prisma', async () => ({
  PrismaServicePlugin: new (await import('elysia')).default({ name: 'PrismaServiceStub' }),
}))
vi.mock('../../facebook/repository', async () => ({
  FacebookRepositoryPlugin: new (await import('elysia')).default({ name: 'FacebookRepoStub' }),
}))

describe('phoneSearchTerm', () => {
  test.each([
    ['081-234-5678', '+66812345678'],
    ['0812345678', '+66812345678'],
    ['+66812345678', '+66812345678'],
    ['5678', '5678'],
    ['K7QX2M', null],
    ['สมชาย', null],
    ['12', null],
  ])('%s -> %s', (search, expected) => {
    expect(phoneSearchTerm(search)).toBe(expected)
  })
})

describe('AdminFacebookPageRepository.getConnectAttempts', () => {
  const setup = () => {
    const facebookConnectAttempt = {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    }
    const repository = new AdminFacebookPageRepository({
      facebookConnectAttempt,
    } as unknown as PrismaService)
    return { facebookConnectAttempt, repository }
  }

  test('matches a reference code case-insensitively and never as a phone number', async () => {
    const { facebookConnectAttempt, repository } = setup()

    await repository.getConnectAttempts({ limit: 20, page: 2, search: ' k7qx2m ' })

    const { where, skip, take } = facebookConnectAttempt.findMany.mock.calls[0][0]
    expect({ skip, take }).toEqual({ skip: 20, take: 20 })
    expect(where.OR).toEqual([
      { referenceCode: 'K7QX2M' },
      { user: { name: { contains: 'k7qx2m', mode: 'insensitive' } } },
    ])
  })

  test('filters by user and outcome and leaves the heavy JSON out of the list', async () => {
    const { facebookConnectAttempt, repository } = setup()

    await repository.getConnectAttempts({
      limit: 10,
      page: 1,
      userId: 'user-1',
      outcome: ['FAILED'],
    })

    const args = facebookConnectAttempt.findMany.mock.calls[0][0]
    expect(args.where).toEqual({ userId: 'user-1', outcome: { in: ['FAILED'] } })
    expect(args.omit).toMatchObject({ context: true, steps: true })
  })
})

describe('AdminFacebookPageService.getConnectFailureSummary', () => {
  test('totals outcomes and counts distinct users per failure group', async () => {
    const group = {
      failedStep: 'login',
      platform: 'ios',
      errorDomain: 'com.facebook.sdk.login',
      errorCode: '308',
    }
    const repository = {
      getConnectFailureSummary: vi.fn().mockResolvedValue(
        ok({
          outcomes: [
            { outcome: 'SUCCESS', _count: { _all: 5 } },
            { outcome: 'FAILED', _count: { _all: 3 } },
          ],
          failures: [
            {
              ...group,
              _count: { _all: 3 },
              _max: { createdAt: new Date('2026-11-12T00:00:00Z'), errorMessage: 'Login Failed' },
            },
          ],
          failureUsers: [
            { ...group, userId: 'u1' },
            { ...group, userId: 'u2' },
          ],
        })
      ),
    }
    const service = new AdminFacebookPageService(
      repository as unknown as AdminFacebookPageRepository,
      {} as FacebookRepository
    )

    const now = new Date('2026-11-12T12:00:00Z')
    const result = await service.getConnectFailureSummary(7, now)

    expect(repository.getConnectFailureSummary).toHaveBeenCalledWith(
      new Date('2026-11-05T12:00:00Z')
    )
    expect(result._unsafeUnwrap()).toEqual({
      days: 7,
      totals: { attempts: 8, succeeded: 5, failed: 3, cancelled: 0, abandoned: 0 },
      failures: [
        {
          ...group,
          attempts: 3,
          users: 2,
          lastSeenAt: new Date('2026-11-12T00:00:00Z'),
          exampleMessage: 'Login Failed',
        },
      ],
    })
  })
})
