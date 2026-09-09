import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { NotificationApiKeySource } from '@pple-today/database/prisma'
import { err, ok } from 'neverthrow'

/**
 * The app a notification key speaks for, as every path downstream needs to see
 * it: `name` and `icon` are what the notification carries into the notification
 * centre and the OS tray, and `id` is what the `Notification` row records.
 *
 * Deliberately *not* carrying the app's own `MiniAppSource`. Capability is the
 * key's `source`, and an app source sitting on the shape the guards read would
 * be an open invitation to answer the capability question with it again.
 */
export interface BoundApp {
  id: string
  name: string
  /** Public icon URL. Null, or — on legacy rows — a base64 data URI. */
  icon: string | null
}

/**
 * A key's binding: who issued it, and which app it speaks for.
 *
 * These are two independent facts, and keeping them apart is the whole point of
 * this module. `miniApp` is *attribution* — whose name and icon the
 * notification wears, null for a legacy key that speaks for no app. `source` is
 * *capability* — what the key is allowed to ask for.
 *
 * They were one fact until the central team needed to notify a Builder App's
 * users with an audience the app itself may not name (a phone number, a role, a
 * broadcast). Such a key wears the Builder App's identity but was issued by a
 * vetted admin, so the app's own source cannot answer for it any more.
 *
 * The guards take the narrowest shape they need, so a caller can pass whatever
 * it happens to hold.
 */
export interface KeyBinding {
  source: NotificationApiKeySource
  miniApp: BoundApp | null
}

/**
 * Whether sends on this key count against a daily quota.
 *
 * The daily quota is a *Builder App Resource Limit*, so only a key issued to an
 * outside Builder is held to one: an admin-issued key is not, whichever app it
 * speaks for, and a legacy unbound key has never been metered on either
 * endpoint. Metered by default — a source this code has not heard of is treated
 * as an outside Builder's rather than quietly granted an unlimited send path.
 *
 * One predicate for both the send path's claim and the usage the Console
 * reports, so what is enforced and what is shown cannot drift apart.
 */
export const isMeteredKey = (key: Pick<KeyBinding, 'source'>): boolean =>
  key.source !== NotificationApiKeySource.ADMIN

/**
 * Guard the raw-targeting send path, where the caller names its own audience —
 * phone numbers, roles, a broadcast to everyone.
 *
 * Whether a key may do that is a property of *who issued it*, not of which app
 * it is bound to. Platform-provisioned keys are handed to outsiders and
 * confined to that Builder's own App Users: one asking to reach a phone number
 * is asking for something it must never be able to do, and answering with a
 * *different*, quietly narrowed send would hide that.
 *
 * Admin-issued keys are vetted at the point of issue, so they keep the full
 * capability whatever they are bound to. That covers three cases with one rule:
 * a legacy unbound key (unchanged, as it always was), a key bound to a
 * central-team app so its notifications carry that app's identity, and a key an
 * admin binds to a *Builder* App in order to reach that app's users with an
 * audience the Builder itself may not express. Binding must not cost a capability
 * the issuer already had.
 */
export const requireUnboundKey = (key: Pick<KeyBinding, 'source'>) => {
  if (key.source !== NotificationApiKeySource.ADMIN) {
    return err({
      code: InternalErrorCode.NOTIFICATION_KEY_APP_BOUND,
      message:
        'This notification key was provisioned for a Builder App, which cannot name its own recipients. Send content to POST /external/notifications instead; the platform resolves the audience from the app’s own users.',
    })
  }

  return ok()
}

/**
 * Guard the audience-bound send path.
 *
 * The only key with nothing to do here is a legacy one: it speaks for no app,
 * so there is no App User registry to resolve an audience from, and it belongs
 * on the raw-targeting path. A bound key of either provenance is welcome —
 * admin-issued keys may pick whichever audience they actually want.
 *
 * Returns the key narrowed to a non-null app, so the caller carries a binding
 * it has proved rather than re-checking downstream.
 */
export const requireAppBoundKey = <T extends { miniApp: unknown }>(key: T) => {
  if (key.miniApp === null) {
    return err({
      code: InternalErrorCode.NOTIFICATION_KEY_NOT_APP_BOUND,
      message:
        'This notification key is not bound to a mini app, so it has no audience to resolve. Use the raw-targeting endpoint instead.',
    })
  }

  return ok(key as T & { miniApp: NonNullable<T['miniApp']> })
}
