/**
 * Pure logic for asking for notification permission and registering the push
 * token. The platform calls live in `libs/notification-registration.ts`.
 */

/**
 * Where the OS stands on this app's notifications.
 * - `granted`: a token can be registered.
 * - `denied`: refused, but the OS will still show its prompt (Android 13+ after
 *   a first refusal).
 * - `blocked`: refused, and the OS will not prompt again (iOS after any refusal,
 *   Android after "don't ask again"). Only Settings can turn them back on.
 */
export type NotificationPermission = 'granted' | 'denied' | 'blocked'

/** `PermissionsAndroid.request(POST_NOTIFICATIONS)`'s result. */
export function fromAndroidRequestResult(result: string): NotificationPermission {
  if (result === 'granted') return 'granted'
  if (result === 'never_ask_again') return 'blocked'
  return 'denied'
}

/**
 * RNFB's `AuthorizationStatus` after `requestPermission`:
 * -1 NOT_DETERMINED, 0 DENIED, 1 AUTHORIZED, 2 PROVISIONAL, 3 EPHEMERAL.
 * iOS shows its prompt once; after a refusal `requestPermission` returns DENIED
 * without showing anything.
 */
export function fromIosAuthorizationStatus(status: number): NotificationPermission {
  if (status === 1 || status === 2 || status === 3) return 'granted'
  if (status === 0) return 'blocked'
  return 'denied'
}

/**
 * Identifies what a successful `/notifications/register` told the server, so an
 * unchanged registration isn't POSTed again on every return to the foreground.
 * Keyed on the user as well: the same token under another account must be sent.
 */
export function registrationFingerprint(userId: string, body: unknown): string {
  return JSON.stringify([userId, body])
}

export const SETTINGS_PROMPT_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * How long after the OS's own prompt was answered the dialog stays away. The
 * prompt sends the app to the background and back, and someone who just said no
 * should not be met by a dialog asking again.
 */
export const OS_PROMPT_QUIET_MS = 60 * 1000

/**
 * Whether to show the "notifications are off" dialog. Never when the OS can
 * still prompt or already allows them, nor right after the OS prompt. Otherwise
 * at most once per {@link SETTINGS_PROMPT_INTERVAL_MS}, unless the app was just
 * opened by its bare link (PPLE ID's "เปิดการแจ้งเตือน" button): that person
 * asked for it.
 */
export function shouldShowSettingsPrompt(input: {
  permission: NotificationPermission
  lastShownAt: number | null
  lastOsPromptAt: number | null
  now: number
  openedByAppLink: boolean
}): boolean {
  if (input.permission !== 'blocked') return false
  if (input.lastOsPromptAt !== null && input.now - input.lastOsPromptAt < OS_PROMPT_QUIET_MS) {
    return false
  }
  if (input.openedByAppLink) return true
  if (input.lastShownAt === null) return true
  return input.now - input.lastShownAt >= SETTINGS_PROMPT_INTERVAL_MS
}

/**
 * Whether `url` is the app's bare scheme (`pple-today://`), the link PPLE ID
 * opens the app with. A query string is allowed; any host or path is a real
 * destination, not this signal.
 */
export function isBareAppLink(url: string, scheme: string): boolean {
  const prefix = `${scheme}://`
  if (!url.startsWith(prefix)) return false
  const rest = url.slice(prefix.length).split(/[?#]/)[0] ?? ''
  return rest === '' || rest === '/'
}
