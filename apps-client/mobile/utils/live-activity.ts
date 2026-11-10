/**
 * Pure logic for the iOS Live Activity side of interactive notifications.
 * See docs/interactive-notifications.md, "Live Activity (iOS)".
 */

/** What the native observer knows. `startToken` is lowercase hex. */
export interface LiveActivityRegistration {
  startToken: string | null
  enabled: boolean
}

/** The two optional fields `/notifications/register` takes for Live Activities. */
export interface LiveActivityRegistrationFields {
  liveActivityStartToken?: string
  liveActivitiesEnabled?: boolean
}

const HEX = /^[0-9a-f]+$/

/**
 * The registration fields to send alongside `supportsTrayInteraction`. Empty on
 * Android and when the native side reports no support (iOS < 17.2), so those
 * registrations are unchanged. A start token that is not lowercase hex is
 * dropped rather than sent.
 */
export function liveActivityRegistrationFields(
  platform: string,
  registration: LiveActivityRegistration | null | undefined
): LiveActivityRegistrationFields {
  if (platform !== 'ios' || !registration) return {}
  const token = registration.startToken?.toLowerCase()
  return {
    ...(token && HEX.test(token) ? { liveActivityStartToken: token } : {}),
    liveActivitiesEnabled: registration.enabled === true,
  }
}

/**
 * The interaction action to leave pending on the notification detail screen.
 * Either `pendingActionId` (a tray action, see `app/_layout.tsx`) or `action`
 * (a Live Activity button: `pple-today://notification/<id>?action=<actionId>`).
 */
export function pendingActionFromParams(
  params: Record<string, string | string[] | undefined>
): string | undefined {
  for (const key of ['pendingActionId', 'action']) {
    const value = params[key]
    const first = Array.isArray(value) ? value[0] : value
    if (typeof first === 'string' && first !== '') return first
  }
  return undefined
}
