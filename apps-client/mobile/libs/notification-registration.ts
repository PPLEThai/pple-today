import { PermissionsAndroid, Platform } from 'react-native'

import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  hasPermission,
  requestPermission,
} from '@react-native-firebase/messaging'

import { getLiveActivityRegistration } from '@app/libs/live-activity'
import { liveActivityRegistrationFields } from '@app/utils/live-activity'
import {
  fromAndroidRequestResult,
  fromIosAuthorizationStatus,
  isBareAppLink,
  type NotificationPermission,
  registrationFingerprint,
  shouldShowSettingsPrompt,
} from '@app/utils/notification-permission'
import { supportsTrayInteraction } from '@app/utils/tray-interaction'

/**
 * Asks for notification permission and registers this device's push token with
 * `/notifications/register`. Runs at launch (once signed in) and every time the
 * app returns to the foreground, so turning notifications on in Settings, or
 * opening the app from PPLE ID's "เปิดการแจ้งเตือน" button, registers a token
 * without a relaunch. See issue #591.
 */

const APP_SCHEME = 'pple-today'
const SETTINGS_PROMPT_SHOWN_AT_KEY = 'notifications:settings-prompt-shown-at'
/** Android can't say whether it will still prompt without prompting; remembered here. */
const ANDROID_BLOCKED_KEY = 'notifications:android-blocked'
/** How long an open by the bare app link counts as the reason for the next check. */
const APP_LINK_FRESH_MS = 15 * 1000

/** The fingerprint of the last successful registration in this process. */
let lastRegistered: string | null = null
/** When the OS's permission prompt last showed in this process. */
let lastOsPromptAt: number | null = null
let appLinkOpenedAt: number | null = null
let inFlight: Promise<DeviceRegistrationResult> | null = null

export interface DeviceRegistrationResult {
  permission: NotificationPermission
  /** The server holds this device's current token for the user. */
  registered: boolean
}

export type RegisterNotificationBody = ReturnType<typeof registrationBody>

function registrationBody(deviceToken: string) {
  return {
    deviceToken,
    // The server builds a different push payload per platform, so it has to know
    // which one this token belongs to.
    platform: Platform.OS === 'ios' ? ('IOS' as const) : ('ANDROID' as const),
    // Asserts that this build can render an app-branded notification from a
    // data-only message. Only the Android path does — see
    // `registerBrandedPushBackgroundHandler` — and on iOS the server brands the
    // push itself, with no client involvement. Registration runs on every cold
    // start after auth, so an upgraded install re-asserts this without any new
    // trigger.
    supportsAppBranding: Platform.OS === 'android',
    // Asserts that this build can show interaction actions on the OS
    // notification and submit them with a response token: on Android the
    // background task and listener in `libs/notification-display.ts`, on iOS the
    // extension (`assets/NotificationService.m`) and the native submit
    // (`modules/notification-actions`). Switched off in one place,
    // `TRAY_INTERACTION_ENABLED`.
    supportsTrayInteraction: supportsTrayInteraction(Platform.OS),
    // iOS 17.2+ only: the push-to-start token and whether the user allows Live
    // Activities. Empty elsewhere. A change re-registers (see `app/_layout.tsx`).
    ...liveActivityRegistrationFields(Platform.OS, getLiveActivityRegistration()),
  }
}

async function readAndroidBlocked(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ANDROID_BLOCKED_KEY)) === '1'
  } catch {
    return false
  }
}

async function writeAndroidBlocked(blocked: boolean): Promise<void> {
  try {
    if (blocked) await AsyncStorage.setItem(ANDROID_BLOCKED_KEY, '1')
    else await AsyncStorage.removeItem(ANDROID_BLOCKED_KEY)
  } catch {
    // Best effort.
  }
}

/**
 * Where the OS stands, asking only when `mayPrompt`. A refusal the OS will no
 * longer prompt for never shows anything, so it is always checked.
 */
async function resolvePermission(mayPrompt: boolean): Promise<NotificationPermission> {
  if (Platform.OS === 'ios') {
    const messaging = getMessaging()
    const status = await hasPermission(messaging)
    if (status === AuthorizationStatus.NOT_DETERMINED) {
      if (!mayPrompt) return 'denied'
      lastOsPromptAt = Date.now()
      const answered = fromIosAuthorizationStatus(await requestPermission(messaging))
      lastOsPromptAt = Date.now()
      return answered
    }
    const permission = fromIosAuthorizationStatus(status)
    // Already allowed: asking again shows nothing and keeps the device
    // registered for remote messages, as every launch has always done.
    if (permission === 'granted') await requestPermission(messaging)
    return permission
  }

  if (Platform.OS === 'android') {
    // Before Android 13 notifications need no runtime permission.
    if (Platform.Version < 33) return 'granted'
    const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    if (await PermissionsAndroid.check(permission)) {
      await writeAndroidBlocked(false)
      return 'granted'
    }
    const knownBlocked = await readAndroidBlocked()
    // Requesting a blocked permission shows nothing and confirms it is still
    // blocked (an auto-reset would bring the prompt back, which is right).
    if (!mayPrompt && !knownBlocked) return 'denied'
    const answered = fromAndroidRequestResult(await PermissionsAndroid.request(permission))
    if (!(knownBlocked && answered === 'blocked')) lastOsPromptAt = Date.now()
    await writeAndroidBlocked(answered === 'blocked')
    return answered
  }

  throw new Error(`Unsupported platform: ${Platform.OS}`)
}

/**
 * Checks permission (prompting if `mayPrompt`), then registers the token unless
 * this process already registered the same one for the same user. Concurrent
 * calls share one run.
 */
export function registerDevice(input: {
  userId: string
  mayPrompt: boolean
  send: (body: RegisterNotificationBody) => Promise<unknown>
}): Promise<DeviceRegistrationResult> {
  if (inFlight) return inFlight
  inFlight = (async (): Promise<DeviceRegistrationResult> => {
    let permission: NotificationPermission = 'denied'
    try {
      permission = await resolvePermission(input.mayPrompt)
      if (permission !== 'granted') return { permission, registered: false }

      const body = registrationBody(await getToken(getMessaging()))
      const fingerprint = registrationFingerprint(input.userId, body)
      // The server is sensitive to bursts (#588): an unchanged registration is
      // not sent again on every return to the foreground.
      if (fingerprint !== lastRegistered) {
        await input.send(body)
        lastRegistered = fingerprint
      }
      return { permission, registered: true }
    } catch (err) {
      console.error('Failed to register notification token', JSON.stringify(err))
      return { permission, registered: false }
    }
  })().finally(() => {
    inFlight = null
  })
  return inFlight
}

/** Whether the OS prompt has shown in this process. */
export function hasPromptedThisProcess(): boolean {
  return lastOsPromptAt !== null
}

/** For logout: the server dropped this device, so the next sign-in must send it again. */
export function forgetDeviceRegistration(): void {
  lastRegistered = null
}

/** Notes that the app was opened by `url`, if it is the bare app link. */
export function noteOpenedByUrl(url: string | null): void {
  if (url && isBareAppLink(url, APP_SCHEME)) appLinkOpenedAt = Date.now()
}

/** Whether the app was just opened by the bare app link. Reading it consumes it. */
export function consumeAppLinkOpen(): boolean {
  const fresh = appLinkOpenedAt !== null && Date.now() - appLinkOpenedAt < APP_LINK_FRESH_MS
  appLinkOpenedAt = null
  return fresh
}

/**
 * Whether to show the "notifications are off" dialog now. Records it as shown
 * when it returns true.
 */
export async function claimSettingsPrompt(
  permission: NotificationPermission,
  openedByAppLink: boolean
): Promise<boolean> {
  if (permission !== 'blocked') return false
  let lastShownAt: number | null = null
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_PROMPT_SHOWN_AT_KEY)
    lastShownAt = raw === null ? null : Number(raw) || null
  } catch {
    // Treated as never shown.
  }
  const now = Date.now()
  const show = shouldShowSettingsPrompt({
    permission,
    lastShownAt,
    lastOsPromptAt,
    now,
    openedByAppLink,
  })
  if (show) {
    try {
      await AsyncStorage.setItem(SETTINGS_PROMPT_SHOWN_AT_KEY, String(now))
    } catch {
      // Best effort.
    }
  }
  return show
}
