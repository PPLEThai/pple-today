import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { MiniAppSource } from '@pple-today/database/prisma'
import { err, ok } from 'neverthrow'

/**
 * The app a notification key speaks for, as every path downstream needs to see
 * it: `source` decides what the key may do, `name` and `icon` are what the
 * notification carries into the notification centre and the OS tray.
 */
export interface BoundApp {
  id: string
  source: MiniAppSource
  name: string
  /** Public icon URL. Null, or — on legacy rows — a base64 data URI. */
  icon: string | null
}

/**
 * A key's binding. Null = a legacy central-team key that speaks for no app.
 *
 * Only `source` decides which send path the key may use; the guards take the
 * narrowest shape they need so a caller can pass whatever it happens to hold.
 */
export interface KeyBinding {
  miniApp: { source: MiniAppSource } | null
}

/**
 * Guard the raw-targeting send path, where the caller names its own audience —
 * phone numbers, roles, a broadcast to everyone.
 *
 * Whether a key may do that is a property of *what kind of app it speaks for*,
 * not of whether it is bound at all. Builder Apps (`PLATFORM`) are provisioned
 * by outsiders and confined to their own App Users: one asking to reach a phone
 * number is asking for something it must never be able to do, and answering
 * with a *different*, quietly narrowed send would hide that. Central-team apps
 * (`ADMIN`) are vetted, and take a bound key only so their notifications carry
 * their identity — attribution must not cost them a capability they already
 * have.
 *
 * A legacy key (no binding) passes through untouched, exactly as it always has.
 */
export const requireUnboundKey = (key: KeyBinding) => {
  if (key.miniApp?.source === MiniAppSource.PLATFORM) {
    return err({
      code: InternalErrorCode.NOTIFICATION_KEY_APP_BOUND,
      message:
        'This notification key is bound to a Builder App, which cannot name its own recipients. Send content to POST /external/notifications instead; the platform resolves the audience from the app’s own users.',
    })
  }

  return ok()
}

/**
 * Guard the audience-bound send path.
 *
 * The only key with nothing to do here is a legacy one: it speaks for no app,
 * so there is no App User registry to resolve an audience from, and it belongs
 * on the raw-targeting path. A bound key of either source is welcome —
 * central-team apps may pick whichever audience they actually want.
 *
 * Returns the key narrowed to a non-null app, so the caller carries a binding
 * it has proved rather than re-checking downstream.
 */
export const requireAppBoundKey = <T extends KeyBinding>(key: T) => {
  if (key.miniApp === null) {
    return err({
      code: InternalErrorCode.NOTIFICATION_KEY_NOT_APP_BOUND,
      message:
        'This notification key is not bound to a mini app, so it has no audience to resolve. Use the raw-targeting endpoint instead.',
    })
  }

  return ok(key as T & { miniApp: NonNullable<T['miniApp']> })
}
