import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { err, ok } from 'neverthrow'

/** The only fact about a key that decides which send path it may use. */
export interface KeyBinding {
  miniAppId: string | null
}

/**
 * Guard the raw-targeting send path, where the caller names its own audience —
 * phone numbers, roles, a broadcast to everyone.
 *
 * That remains a central-team capability. A key bound to a mini app is refused
 * outright rather than having its audience silently rewritten to the app's own
 * users: a Builder App asking to reach a phone number is asking for something it
 * must never be able to do, and answering it with a *different*, quietly
 * narrowed send would hide that.
 *
 * A legacy key (no binding) passes through untouched — this is the whole of the
 * change to the pre-existing path, and null-binding keys behave exactly as they
 * always have.
 */
export const requireUnboundKey = (key: KeyBinding) => {
  if (key.miniAppId !== null) {
    return err({
      code: InternalErrorCode.NOTIFICATION_KEY_APP_BOUND,
      message:
        'This notification key is bound to a mini app and cannot target recipients directly. Send content to POST /external/notifications instead; the platform resolves the audience.',
    })
  }

  return ok()
}
