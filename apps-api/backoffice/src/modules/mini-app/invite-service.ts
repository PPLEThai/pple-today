import { InternalErrorCode } from '@pple-today/api-common/dtos'
import {
  err,
  isThaiMobileE164,
  mapRepositoryError,
  normalizeThaiPhoneNumber,
} from '@pple-today/api-common/utils'
import { MiniAppInviteStatus } from '@pple-today/database/prisma'
import { ok } from 'neverthrow'

import type { InviteNotifier } from './invite-notifier'
import type { MiniAppInviteRepository } from './invite-repository'

/**
 * How many testers a Builder may have on one Beta app at a time.
 *
 * Deliberately a service-level constant rather than a schema constraint: a
 * Platform Admin is expected to raise it per app later (via the platform's
 * LimitRequest flow), and that must not need a migration.
 */
export const MINI_APP_INVITE_LIMIT = 20

export type InviteResponse = 'ACCEPT' | 'DECLINE'

/**
 * Beta invitations: who a Builder has invited to test their app, and whether
 * those people agreed.
 *
 * Kept free of Elysia/config imports so it can be unit-tested without booting
 * the app's config graph; the plugin wiring lives in `services.ts`.
 */
export class MiniAppInviteService {
  constructor(
    private readonly miniAppInviteRepository: MiniAppInviteRepository,
    private readonly inviteNotifier: InviteNotifier
  ) {}

  /**
   * Map each app's `ownerSub` (the Builder who owns it) to that Builder's
   * display name, in a single lookup.
   *
   * The name is best-effort: a null owner (central-team apps) or an owner with
   * no matching account resolves to nothing, and a lookup failure yields an
   * empty map rather than an error — naming the inviter must never stop an
   * invitation being delivered or listed.
   */
  private async resolveInviterNames(ownerSubs: (string | null | undefined)[]) {
    const ids = Array.from(new Set(ownerSubs.filter((sub): sub is string => !!sub)))
    if (ids.length === 0) {
      return new Map<string, string>()
    }

    const result = await this.miniAppInviteRepository.getUserNamesByIds(ids)
    if (result.isErr()) {
      return new Map<string, string>()
    }

    return new Map(result.value.map((user) => [user.id, user.name]))
  }

  private async requireMiniApp(miniAppId: string) {
    const result = await this.miniAppInviteRepository.getMiniApp(miniAppId)

    if (result.isErr()) {
      return mapRepositoryError(result.error)
    }

    if (!result.value) {
      return err({
        code: InternalErrorCode.MINI_APP_NOT_FOUND,
        message: `No mini app with id ${miniAppId}`,
      })
    }

    return ok(result.value)
  }

  /** Every invite on an app, whatever its status — the Builder's tester list. */
  async listInvites(miniAppId: string) {
    const miniApp = await this.requireMiniApp(miniAppId)
    if (miniApp.isErr()) return miniApp

    const invites = await this.miniAppInviteRepository.listByMiniApp(miniAppId)

    if (invites.isErr()) {
      return mapRepositoryError(invites.error)
    }

    return invites
  }

  /**
   * Whether an identity is an accepted invited tester of one app — the
   * Beta-invitee membership read the platform's edge door composes its decision
   * from. today-v2 owns invited-tester membership, so this is the one door
   * predicate the platform cannot answer from its own database.
   *
   * The app is required (a genuinely unknown id is a not-found, not a silent
   * "false") so a provisioning mismatch surfaces rather than reads as "no
   * access". Answers by account, never phone number — a tester who changed
   * their number keeps the access they accepted.
   */
  async isAcceptedTester(miniAppId: string, userSub: string) {
    const miniApp = await this.requireMiniApp(miniAppId)
    if (miniApp.isErr()) return miniApp

    const result = await this.miniAppInviteRepository.isAcceptedInvitee(miniAppId, userSub)
    if (result.isErr()) {
      return mapRepositoryError(result.error)
    }

    return ok({ isAcceptedTester: result.value })
  }

  /**
   * Invite one tester by phone number.
   *
   * The number is normalised first so that the cap, the duplicate check and
   * every later lookup agree on one spelling — `0812345678` and `+66812345678`
   * are the same tester and must not occupy two seats.
   */
  async createInvite(miniAppId: string, rawPhoneNumber: string) {
    const miniAppResult = await this.requireMiniApp(miniAppId)
    if (miniAppResult.isErr()) return miniAppResult
    const miniApp = miniAppResult.value

    const phoneNumber = normalizeThaiPhoneNumber(rawPhoneNumber)

    // An unrecognised format survives normalisation undeliverable, and each one
    // would quietly consume one of the app's twenty tester seats.
    if (!isThaiMobileE164(phoneNumber)) {
      return err({
        code: InternalErrorCode.MINI_APP_INVITE_INVALID_PHONE_NUMBER,
        message: `${rawPhoneNumber} is not a Thai mobile number. Use 0XXXXXXXXX or +66XXXXXXXXX.`,
      })
    }

    const existingResult = await this.miniAppInviteRepository.findOne(miniAppId, phoneNumber)
    if (existingResult.isErr()) {
      return mapRepositoryError(existingResult.error)
    }

    const existing = existingResult.value
    // A declined invite is re-sendable — the tester said no once, and the
    // Builder is allowed to ask again. Pending and accepted ones are not:
    // re-sending would silently reset a tester's own answer.
    if (existing && existing.status !== MiniAppInviteStatus.DECLINED) {
      return err({
        code: InternalErrorCode.MINI_APP_INVITE_ALREADY_EXISTS,
        message: `${phoneNumber} has already been invited to this app`,
      })
    }

    // The cap is checked on every path that could take a seat, including
    // re-opening a declined invite. A declined row holds no seat, so it never
    // counts itself here — but re-opening it claims one, and by then the seat
    // it freed may already have gone to someone else. Seat accounting is a
    // single transactional claim so concurrent creates cannot both squeeze in.
    const inviteResult = await this.miniAppInviteRepository.upsertPendingUnderCap(
      miniAppId,
      phoneNumber,
      MINI_APP_INVITE_LIMIT
    )
    if (inviteResult.isErr()) {
      return mapRepositoryError(inviteResult.error)
    }

    if (inviteResult.value.status === 'limit_exceeded') {
      return err({
        code: InternalErrorCode.MINI_APP_INVITE_LIMIT_EXCEEDED,
        message: `This app already has the maximum of ${MINI_APP_INVITE_LIMIT} testers. Remove a tester before inviting another.`,
      })
    }

    // Delivery is best-effort and reported, not enforced: the invite row is the
    // durable fact, and the invitee can still find it in their inbox if the
    // push never lands.
    const inviterNames = await this.resolveInviterNames([miniApp.ownerSub])
    const inviterName = miniApp.ownerSub ? inviterNames.get(miniApp.ownerSub) : undefined
    const notified = await this.inviteNotifier.notifyInvitee(phoneNumber, miniApp, inviterName)

    return ok({ invite: inviteResult.value.invite, notified })
  }

  /**
   * Remove a tester. Deleting the row is what revokes access — listing
   * eligibility reads accepted invites live, so there is no grant to expire.
   */
  async deleteInvite(miniAppId: string, rawPhoneNumber: string) {
    const miniApp = await this.requireMiniApp(miniAppId)
    if (miniApp.isErr()) return miniApp

    const phoneNumber = normalizeThaiPhoneNumber(rawPhoneNumber)
    const removed = await this.miniAppInviteRepository.remove(miniAppId, phoneNumber)

    if (removed.isErr()) {
      return mapRepositoryError(removed.error)
    }

    if (!removed.value) {
      return err({
        code: InternalErrorCode.MINI_APP_INVITE_NOT_FOUND,
        message: `${phoneNumber} has no invite to this app`,
      })
    }

    return ok()
  }

  /** The invitee's own inbox: invitations waiting on their answer. */
  async listPendingInvitesForUser(phoneNumber: string) {
    const invites = await this.miniAppInviteRepository.listPendingForPhoneNumber(
      normalizeThaiPhoneNumber(phoneNumber)
    )

    if (invites.isErr()) {
      return mapRepositoryError(invites.error)
    }

    const inviterNames = await this.resolveInviterNames(
      invites.value.map((invite) => invite.miniApp.ownerSub)
    )

    return ok(
      invites.value.map((invite) => ({
        miniAppId: invite.miniAppId,
        miniAppName: invite.miniApp.name,
        miniAppSlug: invite.miniApp.slug,
        inviterName: invite.miniApp.ownerSub
          ? inviterNames.get(invite.miniApp.ownerSub)
          : undefined,
        createdAt: invite.createdAt,
      }))
    )
  }

  /**
   * Accept or decline an invitation.
   *
   * The invite is found by the *requesting user's own* phone number, which is
   * what makes consent safe: a user can only ever answer invitations addressed
   * to them. Accepting writes their `userId`, and from that moment the listing
   * matches on the account alone — changing their number later never takes the
   * app away.
   */
  async respondToInvite(
    user: { id: string; phoneNumber: string },
    miniAppId: string,
    response: InviteResponse
  ) {
    const phoneNumber = normalizeThaiPhoneNumber(user.phoneNumber)

    const existingResult = await this.miniAppInviteRepository.findOne(miniAppId, phoneNumber)
    if (existingResult.isErr()) {
      return mapRepositoryError(existingResult.error)
    }

    const existing = existingResult.value
    if (!existing) {
      return err({
        code: InternalErrorCode.MINI_APP_INVITE_NOT_FOUND,
        message: 'You have no invitation to this app',
      })
    }

    if (existing.status !== MiniAppInviteStatus.PENDING) {
      return err({
        code: InternalErrorCode.MINI_APP_INVITE_ALREADY_RESPONDED,
        message: 'You have already answered this invitation',
      })
    }

    const recorded = await this.miniAppInviteRepository.recordResponse(miniAppId, phoneNumber, {
      status: response === 'ACCEPT' ? MiniAppInviteStatus.ACCEPTED : MiniAppInviteStatus.DECLINED,
      userId: user.id,
    })

    if (recorded.isErr()) {
      return mapRepositoryError(recorded.error)
    }

    return recorded
  }
}
