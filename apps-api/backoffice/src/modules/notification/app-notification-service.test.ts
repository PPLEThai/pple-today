import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { MiniAppSource, MiniAppTier } from '@pple-today/database/prisma'
import { err, ok } from 'neverthrow'
import { describe, expect, test, vi } from 'vitest'

import type {
  ActiveKeyUsage,
  AppNotificationRepository,
  UsageClaim,
} from './app-notification-repository'
import {
  AppBoundKey,
  AppNotificationContent,
  AppNotificationService,
} from './app-notification-service'
import { MAX_DIRECT_RECIPIENTS, type NamedRecipient } from './direct-recipients'
import type { CreateAppNotificationBody } from './models'
import type { NotificationRepository } from './repository'

const KEY_ID = 'notification-key-id'
const MINI_APP_ID = 'mini-app-id'
const OWNER = 'owner-sub'
const INVITEE = 'invitee-sub'
const STRANGER = 'stranger-sub'

const OWNER_PHONE = '+66811111111'
const INVITEE_PHONE = '+66822222222'

// 11:30 on 2026-07-19 in Bangkok; the window resets at 17:00Z the same day.
const NOW = new Date('2026-07-19T04:30:00.000Z')
const DAY_START = new Date('2026-07-18T17:00:00.000Z')
const NEXT_RESET = new Date('2026-07-19T17:00:00.000Z')

const CONTENT = { header: 'Canvassing today', message: 'Three streets left in Bang Rak' }

/** A send to the app's whole audience — what every send used to be. */
const toAll = (overrides: Partial<CreateAppNotificationBody> = {}): CreateAppNotificationBody => ({
  audience: { kind: 'all' },
  content: CONTENT,
  ...overrides,
})

/** A send to a named subset of that same audience. */
const toDirect = (
  recipients: NamedRecipient[],
  overrides: Partial<CreateAppNotificationBody> = {}
): CreateAppNotificationBody => ({
  audience: { kind: 'direct', recipients },
  content: CONTENT,
  ...overrides,
})

const builderApp = {
  id: MINI_APP_ID,
  source: MiniAppSource.PLATFORM,
  name: 'Canvassing',
  icon: 'https://cdn.example/canvassing.png',
}
const centralTeamApp = { ...builderApp, source: MiniAppSource.ADMIN }

const appBoundKey = (overrides: Partial<AppBoundKey> = {}): AppBoundKey => ({
  id: KEY_ID,
  miniApp: builderApp,
  dailyQuota: 10,
  ...overrides,
})

/** A metered Builder App on the same 10/day budget `appBoundKey` carries. */
const METERED = { dailyQuota: 10, miniApp: builderApp }

/** A `getUsageSince` stand-in; metered unless the test says otherwise. */
const fakeUsage = (overrides: Partial<ActiveKeyUsage> & { sent: number }) =>
  vi.fn(async () => ok<ActiveKeyUsage | null>({ ...METERED, ...overrides }))

/**
 * In-memory stand-in for `AppNotificationRepository`. Usage rows persist across
 * calls so the quota can be exercised as a *sequence* of sends — which is the
 * only way the rule that matters (the send that would overrun is refused) is
 * actually tested. The repository's own query shapes are asserted in its own
 * test.
 */
const createFakeAppNotificationRepository = (
  overrides: {
    tier?: MiniAppTier
    ownerSub?: string | null
    appUserIds?: string[]
    acceptedInviteUserIds?: Set<string>
    /** Numbers the app's own App Users hold, as the repository would report. */
    appUserPhones?: Record<string, string>
  } = {}
) => {
  const usage: {
    id: string
    keyId: string
    usedAt: Date
    units: number
    idempotencyKey?: string
    body: unknown
  }[] = []
  let nextUsageId = 1
  const audience = {
    slug: 'canvassing',
    tier: overrides.tier ?? MiniAppTier.LIVE,
    ownerSub: overrides.ownerSub === undefined ? OWNER : overrides.ownerSub,
    appUserIds: overrides.appUserIds ?? [OWNER, INVITEE, STRANGER],
    acceptedInviteUserIds: overrides.acceptedInviteUserIds ?? new Set<string>(),
  }
  const appUserPhones = overrides.appUserPhones ?? {
    [OWNER_PHONE]: OWNER,
    [INVITEE_PHONE]: INVITEE,
  }

  const spent = (keyId: string, since: Date) =>
    usage
      .filter((row) => row.keyId === keyId && row.usedAt >= since)
      .reduce((total, row) => total + row.units, 0)

  return {
    usage,
    audience,
    getAudienceInput: vi.fn(async () => ok(audience)),
    getAppUserSubsByPhone: vi.fn(async (_miniAppId: string, phones: string[]) =>
      ok(
        new Map(
          phones.flatMap((phone) => (appUserPhones[phone] ? [[phone, appUserPhones[phone]]] : []))
        )
      )
    ),
    /**
     * Atomic claim. Deliberately does not `await` between the sum and the write
     * — that gap is the race the real `$transaction` + `FOR UPDATE` closes, and
     * leaving a yield here would let the concurrent-quota test pass for the
     * wrong reason (or fail the demonstration).
     */
    claimUsage: vi.fn(async (claim: UsageClaim) => {
      const used = spent(claim.notificationApiKeyId, claim.since)

      if (claim.idempotencyKey !== undefined) {
        const replayed = usage.find(
          (row) =>
            row.keyId === claim.notificationApiKeyId && row.idempotencyKey === claim.idempotencyKey
        )
        if (replayed) {
          return ok({
            status: 'replayed' as const,
            usageLogId: replayed.id,
            body: replayed.body,
            used,
          })
        }
      }

      if (claim.dailyQuota !== null && used + claim.units > claim.dailyQuota) {
        return ok({ status: 'quota_exceeded' as const, used })
      }

      const id = `usage-${nextUsageId++}`
      usage.push({
        id,
        keyId: claim.notificationApiKeyId,
        usedAt: NOW,
        units: claim.units,
        idempotencyKey: claim.idempotencyKey,
        body: claim.body,
      })
      return ok({ status: 'ok' as const, usageLogId: id, used: used + claim.units })
    }),
    releaseUsage: vi.fn(async (usageLogId: string) => {
      const index = usage.findIndex((row) => row.id === usageLogId)
      if (index !== -1) usage.splice(index, 1)
      return ok({})
    }),
    setDailyQuota: vi.fn(async () => ok(1)),
    getUsageSince: vi.fn(async () =>
      ok<ActiveKeyUsage | null>({
        ...METERED,
        sent: usage.reduce((total, row) => total + row.units, 0),
      })
    ),
  }
}

const createFakeNotificationRepository = () => ({
  sendNotificationToUser: vi.fn(
    async (
      _audience: { type: string; details?: string[] },
      _content: AppNotificationContent,
      _options?: { apiKeyId?: string; app?: { id: string; name: string } }
    ) => ok(undefined)
  ),
})

const REDIRECT_ORIGIN = 'https://miniapp.peoplesparty.or.th'

const createService = (
  appNotificationRepository = createFakeAppNotificationRepository(),
  notificationRepository = createFakeNotificationRepository()
) => ({
  appNotificationRepository,
  notificationRepository,
  service: new AppNotificationService(
    appNotificationRepository as unknown as AppNotificationRepository,
    notificationRepository as unknown as NotificationRepository,
    REDIRECT_ORIGIN,
    () => NOW
  ),
})

/** The last usage-log row, parsed — the audit trail as it was actually written. */
const lastUsageBody = (repository: ReturnType<typeof createFakeAppNotificationRepository>) =>
  JSON.parse(repository.usage[repository.usage.length - 1].body as string)

describe('AppNotificationService.send', () => {
  describe('the key decides who may use this path at all', () => {
    test('a legacy key with no app binding is refused', async () => {
      const { service, notificationRepository } = createService()

      const result = await service.send(appBoundKey({ miniApp: null }), toAll())

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_KEY_NOT_APP_BOUND)
      // Nothing was sent: there is no app to resolve an audience from.
      expect(notificationRepository.sendNotificationToUser).not.toHaveBeenCalled()
    })

    test('a binding to an app that no longer exists is an error, not an empty send', async () => {
      const repository = createFakeAppNotificationRepository()
      repository.getAudienceInput = vi.fn(async () => err({ code: 'RECORD_NOT_FOUND' }) as never)
      const { service } = createService(repository)

      const result = await service.send(appBoundKey(), toAll())

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_NOT_FOUND)
    })
  })

  describe('recipients are resolved server-side from the App User registry', () => {
    test('a Live app reaches its App Users, addressed by user id', async () => {
      const { service, notificationRepository } = createService()

      const result = await service.send(appBoundKey(), toAll())

      expect(result._unsafeUnwrap().recipientCount).toBe(3)
      const [audience, content, options] =
        notificationRepository.sendNotificationToUser.mock.calls[0]
      expect(audience).toEqual({ type: 'USER_ID', details: [OWNER, INVITEE, STRANGER] })
      expect(content).toEqual(CONTENT)
      // The audience-bound path writes its own content-only usage log, so the
      // shared send path must not also meter this against the key.
      expect(options?.apiKeyId).toBeUndefined()
    })

    test('a Beta app reaches only accepted invitees who have opened it', async () => {
      const repository = createFakeAppNotificationRepository({
        tier: MiniAppTier.BETA,
        appUserIds: [OWNER, INVITEE, STRANGER],
        acceptedInviteUserIds: new Set([INVITEE]),
      })
      const { service, notificationRepository } = createService(repository)

      const result = await service.send(appBoundKey(), toAll())

      expect(result._unsafeUnwrap().recipientCount).toBe(2)
      const [audience] = notificationRepository.sendNotificationToUser.mock.calls[0]
      expect(audience).toEqual({ type: 'USER_ID', details: [OWNER, INVITEE] })
    })

    test('narrowing the tier narrows the next send, with nothing to re-provision', async () => {
      const repository = createFakeAppNotificationRepository({
        acceptedInviteUserIds: new Set([INVITEE]),
      })
      const { service, notificationRepository } = createService(repository)

      await service.send(appBoundKey(), toAll())
      repository.audience.tier = MiniAppTier.DRAFT
      await service.send(appBoundKey(), toAll())

      const [firstAudience] = notificationRepository.sendNotificationToUser.mock.calls[0]
      const [secondAudience] = notificationRepository.sendNotificationToUser.mock.calls[1]
      expect(firstAudience).toEqual({ type: 'USER_ID', details: [OWNER, INVITEE, STRANGER] })
      expect(secondAudience).toEqual({ type: 'USER_ID', details: [OWNER] })
    })

    test('an app nobody has opened sends nothing and costs nothing', async () => {
      const repository = createFakeAppNotificationRepository({ appUserIds: [] })
      const { service, notificationRepository } = createService(repository)

      const result = await service.send(appBoundKey(), toAll())

      expect(result._unsafeUnwrap().recipientCount).toBe(0)
      expect(notificationRepository.sendNotificationToUser).not.toHaveBeenCalled()
      // A broadcast debits the audience size, and this audience is nobody. The
      // call is still recorded — that row is the audit trail — but it buys no
      // deliveries, so it is charged for none.
      expect(repository.usage).toHaveLength(1)
      expect(repository.usage[0].units).toBe(0)
    })
  })

  describe('an app may name who it notifies', () => {
    test('a named App User is delivered to, and nobody else is', async () => {
      const { service, notificationRepository } = createService()

      const result = await service.send(appBoundKey(), toDirect([{ sub: INVITEE }]))

      expect(result._unsafeUnwrap()).toMatchObject({
        results: [{ recipient: { sub: INVITEE }, status: 'delivered' }],
      })
      const [audience] = notificationRepository.sendNotificationToUser.mock.calls[0]
      expect(audience).toEqual({ type: 'USER_ID', details: [INVITEE] })
    })

    test('a phone resolves to the same person as their sub', async () => {
      const { service, notificationRepository } = createService()

      // Domestic spelling of INVITEE_PHONE: canonicalised to E.164 before lookup.
      const result = await service.send(appBoundKey(), toDirect([{ phone: '0822222222' }]))

      expect(result._unsafeUnwrap().results).toEqual([
        { recipient: { phone: '0822222222' }, status: 'delivered' },
      ])
      const [audience] = notificationRepository.sendNotificationToUser.mock.calls[0]
      expect(audience).toEqual({ type: 'USER_ID', details: [INVITEE] })
    })

    test('naming narrows the audience and can never widen it', async () => {
      // STRANGER is an App User but holds no number the app knows, and this
      // number belongs to nobody in the app at all — naming it reaches no one.
      const { service, notificationRepository } = createService()

      const result = await service.send(appBoundKey(), toDirect([{ phone: '0899999999' }]))

      expect(result._unsafeUnwrap()).toMatchObject({
        results: [{ recipient: { phone: '0899999999' }, status: 'not_reachable' }],
      })
      expect(notificationRepository.sendNotificationToUser).not.toHaveBeenCalled()
    })

    test('someone outside the current tier is not reachable, however they are named', async () => {
      // A Draft app is private to its Builder: the invitee is an App User and
      // the app knows their number, but the tier does not admit them.
      const repository = createFakeAppNotificationRepository({ tier: MiniAppTier.DRAFT })
      const { service } = createService(repository)

      const result = await service.send(
        appBoundKey(),
        toDirect([{ sub: INVITEE }, { phone: INVITEE_PHONE }])
      )

      expect(result._unsafeUnwrap().results?.map((entry) => entry.status)).toEqual([
        'not_reachable',
        'not_reachable',
      ])
    })

    test('every way of being unreachable answers with the one collapsed status', async () => {
      // No PPLE ID account, an account that never opened this app, and a number
      // that is not a number at all — the response must not tell them apart.
      const { service } = createService()

      const result = await service.send(
        appBoundKey(),
        toDirect([{ sub: 'no-such-account' }, { phone: '0899999999' }, { phone: 'not-a-number' }])
      )

      expect(result._unsafeUnwrap().results).toEqual([
        { recipient: { sub: 'no-such-account' }, status: 'not_reachable' },
        { recipient: { phone: '0899999999' }, status: 'not_reachable' },
        { recipient: { phone: 'not-a-number' }, status: 'not_reachable' },
      ])
    })

    test('phones are resolved in one batched lookup, not one per entry', async () => {
      // Per-entry lookups would make `not_reachable` measurable by timing,
      // which is the one thing the collapsed status is for.
      const repository = createFakeAppNotificationRepository()
      const { service } = createService(repository)

      await service.send(
        appBoundKey(),
        toDirect([{ phone: OWNER_PHONE }, { phone: INVITEE_PHONE }, { sub: STRANGER }])
      )

      expect(repository.getAppUserSubsByPhone).toHaveBeenCalledTimes(1)
      expect(repository.getAppUserSubsByPhone).toHaveBeenCalledWith(MINI_APP_ID, [
        OWNER_PHONE,
        INVITEE_PHONE,
      ])
    })

    test('two spellings of one person are answered twice but notified once', async () => {
      const { service, notificationRepository } = createService()

      const result = await service.send(
        appBoundKey(),
        toDirect([{ sub: INVITEE }, { phone: INVITEE_PHONE }])
      )

      expect(result._unsafeUnwrap().results?.map((entry) => entry.status)).toEqual([
        'delivered',
        'delivered',
      ])
      const [audience] = notificationRepository.sendNotificationToUser.mock.calls[0]
      expect(audience).toEqual({ type: 'USER_ID', details: [INVITEE] })
    })

    test('a named send never answers with a count of the people it reached', async () => {
      // Both entries below come back `delivered`, which says nothing about
      // whether they are one person or two. A count of *distinct* people
      // reached would say exactly that — so naming a sub alongside a phone
      // would become a way to test whether they belong to the same person,
      // which refusing a both-fields entry exists to prevent.
      const { service } = createService()

      const onePerson = await service.send(
        appBoundKey(),
        toDirect([{ sub: INVITEE }, { phone: INVITEE_PHONE }])
      )
      const twoPeople = await service.send(
        appBoundKey(),
        toDirect([{ sub: INVITEE }, { phone: OWNER_PHONE }])
      )

      expect(onePerson._unsafeUnwrap().recipientCount).toBeUndefined()
      expect(twoPeople._unsafeUnwrap().recipientCount).toBeUndefined()
      // Both calls report the same outcomes, so the bodies differ only in the
      // recipients they echo back — which the caller supplied. The budget they
      // spent still differs, and that disclosure follows from the contract's
      // own de-duplication rule rather than from anything added here.
      const statuses = (result: typeof onePerson) =>
        result._unsafeUnwrap().results?.map((entry) => entry.status)
      expect(statuses(onePerson)).toEqual(['delivered', 'delivered'])
      expect(statuses(twoPeople)).toEqual(statuses(onePerson))
    })

    test('a refusal names the count addressed, never the units it would charge', async () => {
      // The same leak by another route: units are the named list after people
      // it resolved to one person collapse, so quoting them in the 429 would
      // answer the question the response body refuses to.
      const { service } = createService()
      const key = appBoundKey({ dailyQuota: 1 })

      await service.send(key, toDirect([{ sub: OWNER }]))
      const refused = await service.send(
        key,
        toDirect([{ sub: INVITEE }, { phone: INVITEE_PHONE }])
      )

      expect(refused._unsafeUnwrapErr().message).toContain('addresses 2')
      expect(refused._unsafeUnwrapErr().message).not.toContain('addresses 1')
    })

    describe('a recipient list that cannot be honoured is refused whole', () => {
      const refusals: [string, NamedRecipient[]][] = [
        ['an empty list', []],
        ['an entry naming neither sub nor phone', [{}]],
        ['an entry naming both', [{ sub: OWNER, phone: OWNER_PHONE }]],
        [
          'a list over the cap',
          Array.from({ length: MAX_DIRECT_RECIPIENTS + 1 }, (_, index) => ({
            sub: `sub-${index}`,
          })),
        ],
      ]

      test.each(refusals)('%s is a 400', async (_name, recipients) => {
        const repository = createFakeAppNotificationRepository()
        const { service, notificationRepository } = createService(repository)

        const result = await service.send(appBoundKey(), toDirect(recipients))

        expect(result._unsafeUnwrapErr().code).toBe(
          InternalErrorCode.NOTIFICATION_INVALID_RECIPIENTS
        )
        // Never a broadcast, never a no-op, and never charged: the whole point
        // is that a malformed list cannot turn into a wider send.
        expect(notificationRepository.sendNotificationToUser).not.toHaveBeenCalled()
        expect(repository.usage).toHaveLength(0)
      })
    })
  })

  describe('the notification is attributed to the app that sent it', () => {
    test('the bound app travels with the send, name and icon included', async () => {
      const { service, notificationRepository } = createService()

      await service.send(appBoundKey(), toAll())

      const [, , options] = notificationRepository.sendNotificationToUser.mock.calls[0]
      expect(options?.app).toEqual(builderApp)
    })

    test('a central-team app is attributed the same way a Builder App is', async () => {
      // Attribution follows the key, not the audience or the vetting status.
      const { service, notificationRepository } = createService()

      await service.send(appBoundKey({ miniApp: centralTeamApp }), toAll())

      const [, , options] = notificationRepository.sendNotificationToUser.mock.calls[0]
      expect(options?.app).toEqual(centralTeamApp)
    })
  })

  describe('the daily quota is denominated in deliveries, not calls', () => {
    test('a broadcast debits the audience size at send time', async () => {
      const repository = createFakeAppNotificationRepository()
      const { service } = createService(repository)

      const result = await service.send(appBoundKey({ dailyQuota: 10 }), toAll())

      // Three App Users, so three of the day's ten.
      expect(repository.usage[0].units).toBe(3)
      expect(result._unsafeUnwrap()).toMatchObject({ dailyQuota: 10, remaining: 7 })
    })

    test('a direct send debits every name, reached or not', async () => {
      const repository = createFakeAppNotificationRepository()
      const { service } = createService(repository)

      const result = await service.send(
        appBoundKey({ dailyQuota: 10 }),
        toDirect([{ sub: OWNER }, { sub: 'ghost' }])
      )

      // The cost of a send is what the caller asked for, not what it achieved —
      // otherwise a list of strangers would be free to probe with.
      expect(repository.usage[0].units).toBe(2)
      expect(result._unsafeUnwrap()).toMatchObject({ remaining: 8 })
    })

    test('spends across sends and reports what is left', async () => {
      const { service } = createService()

      const first = await service.send(appBoundKey({ dailyQuota: 10 }), toDirect([{ sub: OWNER }]))
      const second = await service.send(appBoundKey({ dailyQuota: 10 }), toAll())

      expect(first._unsafeUnwrap().remaining).toBe(9)
      expect(second._unsafeUnwrap().remaining).toBe(6)
    })

    test('refuses the whole send that would overrun, with nothing delivered', async () => {
      const repository = createFakeAppNotificationRepository()
      const { service, notificationRepository } = createService(repository)
      const key = appBoundKey({ dailyQuota: 4 })

      await service.send(key, toDirect([{ sub: OWNER }, { sub: INVITEE }, { sub: STRANGER }]))
      const refused = await service.send(key, toDirect([{ sub: OWNER }, { sub: INVITEE }]))

      // Two named, one left in the budget: trimmed to fit would be a message
      // the caller believes it sent to both, and retrying it would double-notify.
      expect(refused._unsafeUnwrapErr()).toMatchObject({
        code: InternalErrorCode.NOTIFICATION_QUOTA_EXCEEDED,
        data: { dailyQuota: 4, remaining: 1, resetAt: NEXT_RESET.toISOString() },
      })
      expect(notificationRepository.sendNotificationToUser).toHaveBeenCalledTimes(1)
      expect(repository.usage).toHaveLength(1)
    })

    test('a send that exactly fills the budget is allowed', async () => {
      const { service } = createService()

      const result = await service.send(appBoundKey({ dailyQuota: 3 }), toAll())

      expect(result._unsafeUnwrap()).toMatchObject({ recipientCount: 3, remaining: 0 })
    })

    test('counts only sends inside the current window, so it resets daily', async () => {
      const repository = createFakeAppNotificationRepository()
      // Yesterday's sends exhausted the budget, but they fall outside today's
      // window, so today starts from zero.
      repository.usage.push(
        {
          id: 'old-1',
          keyId: KEY_ID,
          usedAt: new Date('2026-07-18T05:00:00.000Z'),
          units: 5,
          body: {},
        },
        {
          id: 'old-2',
          keyId: KEY_ID,
          usedAt: new Date('2026-07-18T06:00:00.000Z'),
          units: 5,
          body: {},
        }
      )
      const { service } = createService(repository)

      const result = await service.send(appBoundKey({ dailyQuota: 10 }), toDirect([{ sub: OWNER }]))

      expect(result._unsafeUnwrap().remaining).toBe(9)
      expect(repository.claimUsage.mock.calls[0][0].since).toEqual(DAY_START)
    })

    test('is metered per key, not across an app', async () => {
      const repository = createFakeAppNotificationRepository()
      const { service } = createService(repository)

      await service.send(appBoundKey({ id: 'key-a', dailyQuota: 3 }), toAll())
      const other = await service.send(appBoundKey({ id: 'key-b', dailyQuota: 3 }), toAll())

      expect(other.isOk()).toBe(true)
    })

    test('a failed send is not charged', async () => {
      const repository = createFakeAppNotificationRepository()
      const notificationRepository = createFakeNotificationRepository()
      notificationRepository.sendNotificationToUser = vi.fn(async () =>
        err({ code: InternalErrorCode.NOTIFICATION_SENT_FAILED, message: 'boom' })
      ) as never
      const { service } = createService(repository, notificationRepository)

      const result = await service.send(appBoundKey(), toAll())

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_SENT_FAILED)
      expect(repository.releaseUsage).toHaveBeenCalledOnce()
      expect(repository.usage).toHaveLength(0)
    })

    test('two concurrent sends at the last of the budget cannot push usage past it', async () => {
      const repository = createFakeAppNotificationRepository()
      const { service } = createService(repository)
      const key = appBoundKey({ dailyQuota: 4 })

      await service.send(key, toDirect([{ sub: OWNER }, { sub: INVITEE }]))

      const results = await Promise.all([
        service.send(key, toDirect([{ sub: OWNER }, { sub: INVITEE }])),
        service.send(key, toDirect([{ sub: OWNER }, { sub: INVITEE }])),
      ])

      const successes = results.filter((result) => result.isOk())
      const failures = results.filter((result) => result.isErr())
      expect(successes).toHaveLength(1)
      expect(failures).toHaveLength(1)
      expect(failures[0]!._unsafeUnwrapErr().code).toBe(
        InternalErrorCode.NOTIFICATION_QUOTA_EXCEEDED
      )
      expect(repository.usage.reduce((total, row) => total + row.units, 0)).toBe(4)
    })

    test('does not hold a key bound to a central-team app to a budget', async () => {
      // The quota is a Builder App Resource Limit. A central-team app taking a
      // bound key to be attributed must not thereby acquire a cap.
      const repository = createFakeAppNotificationRepository()
      const { service, notificationRepository } = createService(repository)
      const key = appBoundKey({ miniApp: centralTeamApp, dailyQuota: 1 })

      await service.send(key, toAll())
      const second = await service.send(key, toAll())

      expect(second.isOk()).toBe(true)
      expect(notificationRepository.sendNotificationToUser).toHaveBeenCalledTimes(2)
      // Recorded, never enforced: the per-call audit trail is written for every
      // send on this path, because the platform cannot write it itself.
      expect(repository.claimUsage.mock.calls.every(([claim]) => claim.dailyQuota === null)).toBe(
        true
      )
      expect(repository.usage).toHaveLength(2)
    })

    test('an unmetered send reports no budget rather than one nothing enforces', async () => {
      const { service } = createService()

      const result = await service.send(appBoundKey({ miniApp: centralTeamApp }), toAll())

      expect(result._unsafeUnwrap()).toEqual({
        recipientCount: 3,
        results: undefined,
        dailyQuota: undefined,
        remaining: undefined,
        resetAt: undefined,
      })
    })
  })

  describe('the per-call audit trail', () => {
    test('records how many were named, how many were reached, and the ratio', async () => {
      const repository = createFakeAppNotificationRepository()
      const { service } = createService(repository)

      await service.send(
        appBoundKey(),
        toDirect([{ sub: OWNER }, { sub: INVITEE }, { sub: 'ghost' }, { sub: 'ghost' }])
      )

      expect(lastUsageBody(repository)).toMatchObject({
        audience: { type: 'APP_USERS_DIRECT', miniAppId: MINI_APP_ID },
        data: CONTENT,
        audit: { named: 4, delivered: 2, matchRatio: 0.5 },
      })
    })

    test('records the content and the app, never who received it', async () => {
      const repository = createFakeAppNotificationRepository()
      const { service } = createService(repository)

      await service.send(appBoundKey(), toDirect([{ sub: OWNER }, { phone: INVITEE_PHONE }]))

      // No recipient identities, deliberately: this row is the only per-call
      // record that exists, and it must not accumulate into a per-person
      // messaging history.
      const body = repository.usage[0].body as string
      expect(body).not.toContain(OWNER)
      expect(body).not.toContain(INVITEE)
      expect(body).not.toContain(INVITEE_PHONE)
    })

    test('a broadcast records the audience it was derived from, not its members', async () => {
      const repository = createFakeAppNotificationRepository()
      const { service } = createService(repository)

      await service.send(appBoundKey(), toAll())

      // Stringified, matching how the raw-targeting path writes this column.
      expect(lastUsageBody(repository)).toMatchObject({
        audience: { type: 'APP_USERS', miniAppId: MINI_APP_ID },
        data: CONTENT,
        audit: { named: 3, delivered: 3, matchRatio: 1 },
      })
      expect(repository.usage[0].body).not.toContain(OWNER)
    })
  })

  describe('an idempotency key makes a retry after a timeout safe', () => {
    test('a repeat is answered from the first attempt, not delivered again', async () => {
      const repository = createFakeAppNotificationRepository()
      const { service, notificationRepository } = createService(repository)
      const body = toDirect([{ sub: OWNER }, { sub: 'ghost' }], { idempotencyKey: 'retry-1' })

      const first = await service.send(appBoundKey(), body)
      const retry = await service.send(appBoundKey(), body)

      expect(retry._unsafeUnwrap()).toEqual(first._unsafeUnwrap())
      expect(notificationRepository.sendNotificationToUser).toHaveBeenCalledTimes(1)
      expect(repository.usage).toHaveLength(1)
    })

    test('a repeat does not spend the budget twice', async () => {
      const { service } = createService()
      const body = toAll({ idempotencyKey: 'retry-1' })
      const key = appBoundKey({ dailyQuota: 10 })

      await service.send(key, body)
      const retry = await service.send(key, body)

      expect(retry._unsafeUnwrap().remaining).toBe(7)
    })

    test('two different keys are two different sends', async () => {
      const repository = createFakeAppNotificationRepository()
      const { service } = createService(repository)

      await service.send(appBoundKey(), toDirect([{ sub: OWNER }], { idempotencyKey: 'a' }))
      await service.send(appBoundKey(), toDirect([{ sub: OWNER }], { idempotencyKey: 'b' }))

      expect(repository.usage).toHaveLength(2)
    })

    test('reusing one with a different number of recipients is a conflict', async () => {
      // The stored row holds outcomes but no identities, so it can only be
      // zipped back onto a list of the same length; answering anyway would tell
      // the caller who was reached under a list they did not send.
      const { service } = createService()

      await service.send(appBoundKey(), toDirect([{ sub: OWNER }], { idempotencyKey: 'retry-1' }))
      const conflicting = await service.send(
        appBoundKey(),
        toDirect([{ sub: OWNER }, { sub: INVITEE }], { idempotencyKey: 'retry-1' })
      )

      expect(conflicting._unsafeUnwrapErr().code).toBe(
        InternalErrorCode.NOTIFICATION_IDEMPOTENCY_KEY_CONFLICT
      )
    })

    test('reusing one across audience kinds is a conflict', async () => {
      const { service } = createService()

      await service.send(appBoundKey(), toAll({ idempotencyKey: 'retry-1' }))
      const conflicting = await service.send(
        appBoundKey(),
        toDirect([{ sub: OWNER }], { idempotencyKey: 'retry-1' })
      )

      expect(conflicting._unsafeUnwrapErr().code).toBe(
        InternalErrorCode.NOTIFICATION_IDEMPOTENCY_KEY_CONFLICT
      )
    })

    test('a retry echoes back the recipients as this call named them', async () => {
      const { service } = createService()

      await service.send(
        appBoundKey(),
        toDirect([{ phone: '0822222222' }], { idempotencyKey: 'retry-1' })
      )
      const retry = await service.send(
        appBoundKey(),
        toDirect([{ phone: '+66822222222' }], { idempotencyKey: 'retry-1' })
      )

      expect(retry._unsafeUnwrap().results).toEqual([
        { recipient: { phone: '+66822222222' }, status: 'delivered' },
      ])
    })
  })

  describe('optional linkPath self-links into this app only', () => {
    test('linkPath “/foo” delivers a MINI_APP destination under this app’s slug', async () => {
      const { service, notificationRepository } = createService()

      const result = await service.send(appBoundKey(), toAll({ linkPath: '/foo' }))

      expect(result.isOk()).toBe(true)
      const [, content] = notificationRepository.sendNotificationToUser.mock.calls[0]
      expect(content).toEqual({
        ...CONTENT,
        link: {
          type: 'MINI_APP',
          destination: 'https://miniapp.peoplesparty.or.th/canvassing/foo',
        },
      })
    })

    test('omitting linkPath keeps today’s content-only behaviour', async () => {
      const { service, notificationRepository } = createService()

      await service.send(appBoundKey(), toAll())

      const [, content] = notificationRepository.sendNotificationToUser.mock.calls[0]
      expect(content).toEqual(CONTENT)
      expect(content).not.toHaveProperty('link')
    })

    test('an unsafe linkPath is a 4xx and is not charged or sent', async () => {
      const repository = createFakeAppNotificationRepository()
      const { service, notificationRepository } = createService(repository)

      const result = await service.send(
        appBoundKey(),
        toAll({ linkPath: 'https://evil.example/foo' })
      )

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_INVALID_LINK_PATH)
      expect(notificationRepository.sendNotificationToUser).not.toHaveBeenCalled()
      expect(repository.usage).toHaveLength(0)
      expect(repository.claimUsage).not.toHaveBeenCalled()
    })
  })
})

describe('AppNotificationService.setDailyQuota', () => {
  test("updates the app's key and reports how many keys it touched", async () => {
    const repository = createFakeAppNotificationRepository()
    const { service } = createService(repository)

    const result = await service.setDailyQuota(MINI_APP_ID, 5000)

    expect(result._unsafeUnwrap()).toEqual({ dailyQuota: 5000 })
    expect(repository.setDailyQuota).toHaveBeenCalledWith(MINI_APP_ID, 5000)
  })

  test('an app with no active key is a not-found, not a silent no-op', async () => {
    const repository = createFakeAppNotificationRepository()
    repository.setDailyQuota = vi.fn(async () => ok(0))
    const { service } = createService(repository)

    const result = await service.setDailyQuota(MINI_APP_ID, 5000)

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_API_KEY_NOT_FOUND)
  })
})

describe('AppNotificationService.getNotificationUsage', () => {
  test('reports deliveries in the current Bangkok quota day against the budget they are held to', async () => {
    const repository = createFakeAppNotificationRepository()
    repository.getUsageSince = fakeUsage({ sent: 7 })
    const { service } = createService(repository)

    const result = await service.getNotificationUsage(MINI_APP_ID)

    expect(result._unsafeUnwrap()).toEqual({ sent: 7, dailyQuota: 10 })
    // Same day boundary the claim path uses — the Console tile and the 429
    // must agree on what "today" means.
    expect(repository.getUsageSince).toHaveBeenCalledWith(MINI_APP_ID, DAY_START)
  })

  test('an app that sent nothing today reports zero, not not-found', async () => {
    const repository = createFakeAppNotificationRepository()
    repository.getUsageSince = fakeUsage({ sent: 0 })
    const { service } = createService(repository)

    const result = await service.getNotificationUsage(MINI_APP_ID)

    expect(result._unsafeUnwrap()).toEqual({ sent: 0, dailyQuota: 10 })
  })

  test('an unmetered app reports no quota rather than one nothing enforces', async () => {
    // An unmetered app's sends still write usage-log rows for audit, so `sent`
    // may climb — but it is measured against no cap, and reporting one would
    // put a number on the Console that no 429 backs.
    const repository = createFakeAppNotificationRepository()
    repository.getUsageSince = fakeUsage({ sent: 42, miniApp: centralTeamApp })
    const { service } = createService(repository)

    const result = await service.getNotificationUsage(MINI_APP_ID)

    expect(result._unsafeUnwrap()).toEqual({ sent: 42 })
  })

  test('an app with no active key is a not-found, not zero sends', async () => {
    const repository = createFakeAppNotificationRepository()
    repository.getUsageSince = vi.fn(async () => ok(null))
    const { service } = createService(repository)

    const result = await service.getNotificationUsage(MINI_APP_ID)

    expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.NOTIFICATION_API_KEY_NOT_FOUND)
  })
})
