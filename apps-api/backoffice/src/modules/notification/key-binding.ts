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

/**
 * Guard the audience-bound send path, the mirror image of `requireUnboundKey`.
 *
 * A legacy central-team key has no app to resolve an audience from, so there is
 * nobody for it to reach here — it belongs on the raw-targeting path. Returns
 * the binding narrowed to a non-null `miniAppId`, so the caller carries a key it
 * has proved is bound rather than re-checking downstream.
 */
export const requireAppBoundKey = <T extends KeyBinding>(key: T) => {
  if (key.miniAppId === null) {
    return err({
      code: InternalErrorCode.NOTIFICATION_KEY_NOT_APP_BOUND,
      message:
        'This notification key is not bound to a mini app, so it has no audience to resolve. Use the raw-targeting endpoint instead.',
    })
  }

  return ok(key as T & { miniAppId: string })
}
