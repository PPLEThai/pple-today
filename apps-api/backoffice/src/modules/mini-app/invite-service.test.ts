import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { MiniAppInviteStatus } from '@pple-today/database/prisma'
import { ok } from 'neverthrow'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import type { InviteNotifier } from './invite-notifier'
import type { MiniAppInviteRepository } from './invite-repository'
import { MINI_APP_INVITE_LIMIT, MiniAppInviteService } from './invite-service'

const MINI_APP_ID = 'beta-app-id'
const INVITEE_ID = 'invitee-user-id'
const INVITEE_PHONE = '+66812345678'

interface InviteRow {
  miniAppId: string
  phoneNumber: string
  status: MiniAppInviteStatus
  userId: string | null
  createdAt: Date
  respondedAt: Date | null
}

/**
 * In-memory stand-in for `MiniAppInviteRepository`. Rows persist across calls,
 * so the rules that actually carry risk — the seat cap, the accept-time binding
 * and revocation — are exercised as a sequence rather than as isolated stubs.
 * The repository's own query shapes are asserted in `invite-repository.test.ts`.
 */
const createFakeRepository = () => {
  const invites: InviteRow[] = []
  const miniApps = [{ id: MINI_APP_ID, name: 'Canvassing', slug: 'canvassing' }]
  const find = (miniAppId: string, phoneNumber: string) =>
    invites.find((invite) => invite.miniAppId === miniAppId && invite.phoneNumber === phoneNumber)

  return {
    invites,
    miniApps,
    getMiniApp: vi.fn(async (miniAppId: string) =>
      ok(miniApps.find((app) => app.id === miniAppId) ?? null)
    ),
    listByMiniApp: vi.fn(async (miniAppId: string) =>
      ok(invites.filter((invite) => invite.miniAppId === miniAppId))
    ),
    countHoldingSeat: vi.fn(async (miniAppId: string) =>
      ok(
        invites.filter(
          (invite) =>
            invite.miniAppId === miniAppId && invite.status !== MiniAppInviteStatus.DECLINED
        ).length
      )
    ),
    findOne: vi.fn(async (miniAppId: string, phoneNumber: string) =>
      ok(find(miniAppId, phoneNumber) ?? null)
    ),
    /**
     * Atomic seat claim. Deliberately does not `await` between the count and
     * the write — that gap is the race the real `$transaction` + `FOR UPDATE`
     * closes, and leaving a yield here would let the concurrent-cap test pass
     * for the wrong reason (or fail the demonstration).
     */
    upsertPendingUnderCap: vi.fn(async (miniAppId: string, phoneNumber: string, limit: number) => {
      const held = invites.filter(
        (invite) =>
          invite.miniAppId === miniAppId && invite.status !== MiniAppInviteStatus.DECLINED
      ).length

      if (held >= limit) {
        return ok({ status: 'limit_exceeded' as const })
      }

      const existing = find(miniAppId, phoneNumber)
      if (existing) {
        existing.status = MiniAppInviteStatus.PENDING
        existing.userId = null
        existing.respondedAt = null
        return ok({ status: 'ok' as const, invite: existing })
      }

      const invite: InviteRow = {
        miniAppId,
        phoneNumber,
        status: MiniAppInviteStatus.PENDING,
        userId: null,
        createdAt: new Date(),
        respondedAt: null,
      }
      invites.push(invite)
      return ok({ status: 'ok' as const, invite })
    }),
    remove: vi.fn(async (miniAppId: string, phoneNumber: string) => {
      const index = invites.findIndex(
        (invite) => invite.miniAppId === miniAppId && invite.phoneNumber === phoneNumber
      )
      if (index === -1) return ok(false)

      invites.splice(index, 1)
      return ok(true)
    }),
    listPendingForPhoneNumber: vi.fn(async (phoneNumber: string) =>
      ok(
        invites
          .filter(
            (invite) =>
              invite.phoneNumber === phoneNumber && invite.status === MiniAppInviteStatus.PENDING
          )
          .map((invite) => ({
            ...invite,
            miniApp: miniApps.find((app) => app.id === invite.miniAppId)!,
          }))
      )
    ),
    listAcceptedMiniAppIds: vi.fn(async (userId: string) =>
      ok(
        new Set(
          invites
            .filter(
              (invite) => invite.userId === userId && invite.status === MiniAppInviteStatus.ACCEPTED
            )
            .map((invite) => invite.miniAppId)
        )
      )
    ),
    recordResponse: vi.fn(
      async (
        miniAppId: string,
        phoneNumber: string,
        response: { status: MiniAppInviteStatus; userId: string }
      ) => {
        const invite = find(miniAppId, phoneNumber)!
        invite.status = response.status
        invite.userId = response.userId
        invite.respondedAt = new Date()
        return ok(invite)
      }
    ),
  }
}

const createFakeNotifier = () => {
  const sent: { phoneNumber: string; miniAppName: string }[] = []
  let delivers = true

  return {
    sent,
    fail: () => {
      delivers = false
    },
    notifyInvitee: vi.fn(async (phoneNumber: string, miniApp: { name: string }) => {
      if (!delivers) return false

      sent.push({ phoneNumber, miniAppName: miniApp.name })
      return true
    }),
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('MiniAppInviteService', () => {
  let repository: ReturnType<typeof createFakeRepository>
  let notifier: ReturnType<typeof createFakeNotifier>
  let service: MiniAppInviteService

  beforeEach(() => {
    repository = createFakeRepository()
    notifier = createFakeNotifier()
    service = new MiniAppInviteService(
      repository as unknown as MiniAppInviteRepository,
      notifier as unknown as InviteNotifier
    )
  })

  const invitee = { id: INVITEE_ID, phoneNumber: INVITEE_PHONE }

  describe('creating an invite', () => {
    test('records a pending invite and delivers it as a notification', async () => {
      const result = await service.createInvite(MINI_APP_ID, INVITEE_PHONE)

      expect(result._unsafeUnwrap().invite).toMatchObject({
        miniAppId: MINI_APP_ID,
        phoneNumber: INVITEE_PHONE,
        status: MiniAppInviteStatus.PENDING,
        userId: null,
      })
      expect(notifier.sent).toEqual([{ phoneNumber: INVITEE_PHONE, miniAppName: 'Canvassing' }])
    })

    test('normalises a local phone number so it is stored and delivered in E.164', async () => {
      const result = await service.createInvite(MINI_APP_ID, '0812345678')

      expect(result._unsafeUnwrap().invite.phoneNumber).toBe('+66812345678')
      expect(notifier.sent[0].phoneNumber).toBe('+66812345678')
    })

    test('reports undelivered notifications without losing the invite', async () => {
      notifier.fail()

      const result = await service.createInvite(MINI_APP_ID, INVITEE_PHONE)

      // The invite is the durable fact; delivery is best-effort, so a failed
      // push must not cost the Builder a seat or leave a half-written state.
      expect(result._unsafeUnwrap().notified).toBe(false)
      expect(repository.invites).toHaveLength(1)
    })

    test.each([
      ['66812345678', 'an international number missing its +'],
      ['081-234-5678', 'a number with separators'],
      ['0812345', 'a number that is too short'],
      ['+1 415 555 0100', 'a non-Thai number'],
      ['not a phone number', 'free text'],
    ])('rejects %s (%s) instead of storing a seat-consuming junk row', async (input) => {
      const result = await service.createInvite(MINI_APP_ID, input)

      expect(result._unsafeUnwrapErr().code).toBe(
        InternalErrorCode.MINI_APP_INVITE_INVALID_PHONE_NUMBER
      )
      expect(repository.invites).toHaveLength(0)
      expect(notifier.sent).toHaveLength(0)
    })

    test('rejects an unknown mini app', async () => {
      const result = await service.createInvite('nope', INVITEE_PHONE)

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_NOT_FOUND)
    })

    test('rejects inviting someone who already has a pending invite', async () => {
      await service.createInvite(MINI_APP_ID, INVITEE_PHONE)

      const result = await service.createInvite(MINI_APP_ID, INVITEE_PHONE)

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_INVITE_ALREADY_EXISTS)
    })

    test('rejects inviting someone who has already accepted', async () => {
      await service.createInvite(MINI_APP_ID, INVITEE_PHONE)
      await service.respondToInvite(invitee, MINI_APP_ID, 'ACCEPT')

      const result = await service.createInvite(MINI_APP_ID, INVITEE_PHONE)

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_INVITE_ALREADY_EXISTS)
    })

    test('allows re-inviting someone who declined, and asks them again', async () => {
      await service.createInvite(MINI_APP_ID, INVITEE_PHONE)
      await service.respondToInvite(invitee, MINI_APP_ID, 'DECLINE')

      const result = await service.createInvite(MINI_APP_ID, INVITEE_PHONE)

      expect(result._unsafeUnwrap().invite.status).toBe(MiniAppInviteStatus.PENDING)
      expect(result._unsafeUnwrap().invite.respondedAt).toBeNull()
      expect(notifier.sent).toHaveLength(2)
    })
  })

  describe('the invite cap', () => {
    const seatsTaken = async () => (await repository.countHoldingSeat(MINI_APP_ID))._unsafeUnwrap()

    const fillToCap = async () => {
      for (let index = 0; index < MINI_APP_INVITE_LIMIT; index++) {
        const result = await service.createInvite(
          MINI_APP_ID,
          `+6681000${String(index).padStart(4, '0')}`
        )
        expect(result.isOk()).toBe(true)
      }
    }

    test(`allows exactly ${MINI_APP_INVITE_LIMIT} testers, then refuses with a clear error`, async () => {
      await fillToCap()

      const result = await service.createInvite(MINI_APP_ID, INVITEE_PHONE)

      const error = result._unsafeUnwrapErr()
      expect(error.code).toBe(InternalErrorCode.MINI_APP_INVITE_LIMIT_EXCEEDED)
      // "Clear" means the Builder learns the limit and what to do about it,
      // not just that something went wrong.
      expect(error.message).toContain(String(MINI_APP_INVITE_LIMIT))
      expect(repository.invites).toHaveLength(MINI_APP_INVITE_LIMIT)
    })

    test('removing a tester frees a seat', async () => {
      await fillToCap()
      await service.deleteInvite(MINI_APP_ID, '+66810000000')

      expect((await service.createInvite(MINI_APP_ID, INVITEE_PHONE)).isOk()).toBe(true)
    })

    test('a declined invite does not hold a seat', async () => {
      await fillToCap()
      // The first tester declines: they are not testing the app, so the
      // Builder should be able to ask someone else instead.
      await service.respondToInvite(
        { id: 'decliner', phoneNumber: '+66810000000' },
        MINI_APP_ID,
        'DECLINE'
      )

      expect((await service.createInvite(MINI_APP_ID, INVITEE_PHONE)).isOk()).toBe(true)
    })

    test('re-inviting someone who declined cannot push the app over the cap', async () => {
      await fillToCap()
      // The decliner's seat is freed…
      await service.respondToInvite(
        { id: 'decliner', phoneNumber: '+66810000000' },
        MINI_APP_ID,
        'DECLINE'
      )
      // …and immediately taken by someone else, putting the app back at the cap.
      expect((await service.createInvite(MINI_APP_ID, INVITEE_PHONE)).isOk()).toBe(true)

      // Asking the decliner again now needs a seat that no longer exists.
      // Re-opening their existing row must not sneak past the cap.
      const result = await service.createInvite(MINI_APP_ID, '+66810000000')

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_INVITE_LIMIT_EXCEEDED)
      expect(await seatsTaken()).toBe(MINI_APP_INVITE_LIMIT)
    })

    test('two concurrent invites at seat 19 cannot produce 21 seated testers', async () => {
      for (let index = 0; index < MINI_APP_INVITE_LIMIT - 1; index++) {
        expect(
          (
            await service.createInvite(
              MINI_APP_ID,
              `+6681000${String(index).padStart(4, '0')}`
            )
          ).isOk()
        ).toBe(true)
      }
      expect(await seatsTaken()).toBe(MINI_APP_INVITE_LIMIT - 1)

      const results = await Promise.all([
        service.createInvite(MINI_APP_ID, '+66820000001'),
        service.createInvite(MINI_APP_ID, '+66820000002'),
      ])

      const successes = results.filter((result) => result.isOk())
      const failures = results.filter((result) => result.isErr())
      expect(successes).toHaveLength(1)
      expect(failures).toHaveLength(1)
      expect(failures[0]!._unsafeUnwrapErr().code).toBe(
        InternalErrorCode.MINI_APP_INVITE_LIMIT_EXCEEDED
      )
      expect(failures[0]!._unsafeUnwrapErr().message).toContain(String(MINI_APP_INVITE_LIMIT))
      expect(await seatsTaken()).toBe(MINI_APP_INVITE_LIMIT)
    })

    test('the cap is per app, not global', async () => {
      repository.miniApps.push({ id: 'other-app', name: 'Other', slug: 'other' })
      await fillToCap()

      expect((await service.createInvite('other-app', INVITEE_PHONE)).isOk()).toBe(true)
    })
  })

  describe('responding to an invite', () => {
    test('accepting binds the invite to the account, not the phone number', async () => {
      await service.createInvite(MINI_APP_ID, INVITEE_PHONE)

      const result = await service.respondToInvite(invitee, MINI_APP_ID, 'ACCEPT')

      const invite = result._unsafeUnwrap()
      expect(invite.status).toBe(MiniAppInviteStatus.ACCEPTED)
      expect(invite.userId).toBe(INVITEE_ID)
      expect(invite.respondedAt).not.toBeNull()
    })

    test('declining is recorded against the account too', async () => {
      await service.createInvite(MINI_APP_ID, INVITEE_PHONE)

      const result = await service.respondToInvite(invitee, MINI_APP_ID, 'DECLINE')

      const invite = result._unsafeUnwrap()
      expect(invite.status).toBe(MiniAppInviteStatus.DECLINED)
      expect(invite.userId).toBe(INVITEE_ID)
      expect(invite.respondedAt).not.toBeNull()
    })

    test('a user cannot respond to an invite addressed to a different number', async () => {
      await service.createInvite(MINI_APP_ID, INVITEE_PHONE)

      const result = await service.respondToInvite(
        { id: 'someone-else', phoneNumber: '+66899999999' },
        MINI_APP_ID,
        'ACCEPT'
      )

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_INVITE_NOT_FOUND)
      expect(repository.invites[0].userId).toBeNull()
    })

    test('an invite cannot be answered twice', async () => {
      await service.createInvite(MINI_APP_ID, INVITEE_PHONE)
      await service.respondToInvite(invitee, MINI_APP_ID, 'ACCEPT')

      const result = await service.respondToInvite(invitee, MINI_APP_ID, 'DECLINE')

      expect(result._unsafeUnwrapErr().code).toBe(
        InternalErrorCode.MINI_APP_INVITE_ALREADY_RESPONDED
      )
      expect(repository.invites[0].status).toBe(MiniAppInviteStatus.ACCEPTED)
    })

    test('responding to an invite that was never sent is a not-found', async () => {
      const result = await service.respondToInvite(invitee, MINI_APP_ID, 'ACCEPT')

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_INVITE_NOT_FOUND)
    })
  })

  describe('the invitee inbox', () => {
    test('lists pending invites for the requesting number with the app name', async () => {
      await service.createInvite(MINI_APP_ID, INVITEE_PHONE)

      const result = await service.listPendingInvitesForUser(INVITEE_PHONE)

      expect(result._unsafeUnwrap()).toEqual([
        expect.objectContaining({
          miniAppId: MINI_APP_ID,
          miniAppName: 'Canvassing',
          miniAppSlug: 'canvassing',
        }),
      ])
    })

    test('does not list invites the user has already answered', async () => {
      await service.createInvite(MINI_APP_ID, INVITEE_PHONE)
      await service.respondToInvite(invitee, MINI_APP_ID, 'ACCEPT')

      expect((await service.listPendingInvitesForUser(INVITEE_PHONE))._unsafeUnwrap()).toEqual([])
    })
  })

  describe('revoking an invite', () => {
    test('removes an accepted tester, ending their access', async () => {
      await service.createInvite(MINI_APP_ID, INVITEE_PHONE)
      await service.respondToInvite(invitee, MINI_APP_ID, 'ACCEPT')

      const result = await service.deleteInvite(MINI_APP_ID, INVITEE_PHONE)

      expect(result.isOk()).toBe(true)
      // Listing eligibility reads accepted invites live, so removing the row
      // is what revokes access — there is no cached grant to invalidate.
      expect(repository.invites).toEqual([])
      expect(
        Array.from((await repository.listAcceptedMiniAppIds(INVITEE_ID))._unsafeUnwrap())
      ).toEqual([])
    })

    test('revoking an invite that is not there is a not-found', async () => {
      const result = await service.deleteInvite(MINI_APP_ID, INVITEE_PHONE)

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_INVITE_NOT_FOUND)
    })

    test('accepts a local-format number, matching how the invite was stored', async () => {
      await service.createInvite(MINI_APP_ID, INVITEE_PHONE)

      expect((await service.deleteInvite(MINI_APP_ID, '0812345678')).isOk()).toBe(true)
      expect(repository.invites).toEqual([])
    })
  })

  describe('listing an app’s invites', () => {
    test('returns every invite with its status, including declined ones', async () => {
      await service.createInvite(MINI_APP_ID, INVITEE_PHONE)
      await service.createInvite(MINI_APP_ID, '+66899999999')
      await service.respondToInvite(invitee, MINI_APP_ID, 'DECLINE')

      const result = await service.listInvites(MINI_APP_ID)

      expect(result._unsafeUnwrap()).toEqual([
        expect.objectContaining({
          phoneNumber: INVITEE_PHONE,
          status: MiniAppInviteStatus.DECLINED,
        }),
        expect.objectContaining({
          phoneNumber: '+66899999999',
          status: MiniAppInviteStatus.PENDING,
        }),
      ])
    })

    test('rejects listing an unknown mini app', async () => {
      const result = await service.listInvites('nope')

      expect(result._unsafeUnwrapErr().code).toBe(InternalErrorCode.MINI_APP_NOT_FOUND)
    })
  })
})
