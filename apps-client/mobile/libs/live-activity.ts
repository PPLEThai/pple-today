import { Platform } from 'react-native'

import { requireOptionalNativeModule } from 'expo'

import type { LiveActivityRegistration } from '@app/utils/live-activity'

/**
 * Thin wrapper over the iOS half of `modules/notification-actions`. Everything is
 * a no-op on Android, on iOS < 17.2, and in a build without the native module.
 */
interface NotificationActionsNative {
  getLiveActivityRegistration(): LiveActivityRegistration | null
  endAllLiveActivities(): void
  addListener(
    eventName: 'onLiveActivityRegistrationChange',
    listener: (registration: LiveActivityRegistration) => void
  ): { remove(): void }
}

const native =
  Platform.OS === 'ios'
    ? requireOptionalNativeModule<NotificationActionsNative>('NotificationActions')
    : null

/** `null` when Live Activities are unsupported here (iOS < 17.2, Android). */
export function getLiveActivityRegistration(): LiveActivityRegistration | null {
  try {
    return native?.getLiveActivityRegistration?.() ?? null
  } catch (err) {
    console.error('Failed to read the Live Activity registration', err)
    return null
  }
}

/** Calls `listener` when the start token or the enablement changes. */
export function addLiveActivityRegistrationListener(
  listener: (registration: LiveActivityRegistration) => void
): { remove(): void } {
  try {
    const subscription = native?.addListener?.('onLiveActivityRegistrationChange', listener)
    if (subscription) return subscription
  } catch (err) {
    console.error('Failed to listen for Live Activity registration changes', err)
  }
  return { remove() {} }
}

/** Ends every interactive Live Activity immediately. For logout. Never throws. */
export function endAllLiveActivities() {
  try {
    native?.endAllLiveActivities?.()
  } catch (err) {
    console.error('Failed to end the Live Activities', err)
  }
}
