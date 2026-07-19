/**
 * Presentation rules for Beta invitations: what the invitee reads when
 * something fails, and what order their invitations arrive in.
 *
 * Kept apart from the components so the wording — the part a Thai speaker
 * reviews, and the part a user actually reads when a tap does not work — is in
 * one place and under test.
 */

const GENERIC_ERROR_MESSAGE = 'เกิดข้อผิดพลาดบางอย่าง'

/**
 * The two ways answering an invitation can lose a race, and what to tell the
 * invitee about each.
 *
 * Both mean the invitation on screen is stale, so both are also the only cases
 * worth refetching the lists over — see `isStaleInviteError`.
 */
const INVITE_RACE_MESSAGES: Record<string, string> = {
  // The Builder removed the tester while the card was still on screen.
  MINI_APP_INVITE_NOT_FOUND: 'คำเชิญนี้ถูกยกเลิกไปแล้ว',
  // Answered on another device, or double-tapped.
  MINI_APP_INVITE_ALREADY_RESPONDED: 'คุณตอบคำเชิญนี้ไปแล้ว',
}

/**
 * The error code inside a rejected API call, if it has one.
 *
 * Network failures arrive as a plain `Error` with no envelope at all, hence the
 * defensive unwrapping.
 */
function inviteErrorCode(error: unknown): string | null {
  const code = (error as { value?: { error?: { code?: unknown } } } | null)?.value?.error?.code

  return typeof code === 'string' ? code : null
}

/**
 * A message the invitee can act on, from whatever the accept/decline call
 * rejected with.
 *
 * Anything outside the two races gets the generic message: a server code is not
 * something an invitee can do anything about.
 */
export function inviteErrorMessage(error: unknown): string {
  const code = inviteErrorCode(error)

  if (code === null) {
    return GENERIC_ERROR_MESSAGE
  }

  return INVITE_RACE_MESSAGES[code] ?? GENERIC_ERROR_MESSAGE
}

/**
 * Whether a failure means the invitation on screen no longer exists as shown.
 *
 * This gates the refetch after a failed answer, and the distinction matters:
 * refetching on *any* failure means a tap made offline clears the cached
 * mini-app list and then fails to refill it, so the user's whole app grid
 * disappears because they answered an invitation with no signal.
 */
export function isStaleInviteError(error: unknown): boolean {
  const code = inviteErrorCode(error)

  return code !== null && code in INVITE_RACE_MESSAGES
}

/**
 * Newest invitation first.
 *
 * The API returns them in repository order, which is not meaningful to a
 * reader; the invitation someone was just notified about is the one they are
 * looking for.
 */
export function sortInvitesByNewestFirst<T extends { createdAt: string | Date }>(
  invites: readonly T[]
): T[] {
  return [...invites].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}
