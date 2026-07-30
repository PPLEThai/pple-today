import { Platform } from 'react-native'

import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging'
import * as Notifications from 'expo-notifications'

import { BrandedPushNotification, parseBrandedPush } from '@app/utils/branded-push'

/**
 * The one Android channel every PPLE Today notification lands in, whoever
 * displays it.
 *
 * `withAndroidPlugin` names this id as FCM's
 * `default_notification_channel_id`, so a notification Play services displays
 * and one this client builds share a single entry in system settings. Without
 * that, the client-built path would land in `expo-notifications`' own fallback
 * channel and users would find two separate switches for what is, to them, one
 * kind of notification.
 *
 * Deliberately *one* channel and not one per app: per-app channels would give
 * true per-app muting, but Android offers no way to delete a channel, so every
 * retired app would leave a permanent orphan behind.
 */
export const DEFAULT_NOTIFICATION_CHANNEL_ID = 'pple-today-default'

/**
 * Create the shared channel if it does not exist yet.
 *
 * Idempotent, and cheap enough to call on every start. It has to run early:
 * Play services can only honour the `default_notification_channel_id` meta-data
 * once the channel it names actually exists, and `presentBrandedPush` needs it
 * before it can present onto it.
 */
export async function ensureDefaultNotificationChannel() {
  if (Platform.OS !== 'android') {
    return
  }
  try {
    await Notifications.setNotificationChannelAsync(DEFAULT_NOTIFICATION_CHANNEL_ID, {
      name: 'การแจ้งเตือน',
      // Matches the heads-up behaviour these notifications have always had.
      importance: Notifications.AndroidImportance.HIGH,
      showBadge: true,
    })
  } catch (err) {
    console.error('Failed to create the default notification channel', JSON.stringify(err))
  }
}

/**
 * Display an app-branded notification ourselves.
 *
 * `expo-notifications` declares its messaging service with `android:priority="-1"`,
 * deliberately yielding to `@react-native-firebase/messaging` — so RNFB owns the
 * incoming message and expo-notifications is used only to present. `subtitle`
 * becomes Android's sub-text (the app name) and `largeIconUrl` the per-notification
 * large icon (the app's icon); the latter needs the `expo-notifications` patch in
 * `patches/`, since upstream's large icon is one static resource for the whole app.
 */
export async function presentBrandedPush(notification: BrandedPushNotification) {
  // A channel is only consulted when it exists; creating it here as well as at
  // startup covers the headless case, where nothing else has run.
  await ensureDefaultNotificationChannel()
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      subtitle: notification.subtitle,
      largeIconUrl: notification.largeIconUrl,
      // Carried through so tapping resolves the same destination an
      // FCM-displayed notification would. See the response listener in
      // `app/_layout.tsx`.
      data: notification.data,
    },
    // Names the channel rather than passing `null`: a null trigger would send the
    // notification to `expo-notifications`' fallback channel — a second entry in
    // system settings — and log an error on the way.
    trigger: { channelId: DEFAULT_NOTIFICATION_CHANNEL_ID },
  })
}

/**
 * Take over display of attributed Android pushes while the app is backgrounded or
 * killed.
 *
 * The server sends those as data-only messages precisely so that Play services
 * does not display them first, leaving nothing to brand. Anything that is not an
 * attributed push still arrives with a `notification` block, is displayed by Play
 * services without this handler running at all, and `parseBrandedPush` returns
 * `null` for it here.
 *
 * Registered from `index.js` rather than from a component, because a data-only
 * message starts the app as a headless task: no root view is mounted, so no route
 * module — including `app/_layout.tsx` — is ever evaluated.
 *
 * iOS needs none of this. Its attributed pushes keep a `notification` block, and
 * the Notification Service Extension already downloads `fcm_options.image` and
 * passes `aps.alert.subtitle` through.
 */
export function registerBrandedPushBackgroundHandler() {
  if (Platform.OS !== 'android') {
    return
  }
  setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
    const notification = parseBrandedPush(remoteMessage.data)
    if (!notification) {
      return
    }
    try {
      await presentBrandedPush(notification)
    } catch (err) {
      // Losing the notification is the worst outcome available here; throwing
      // out of a headless task would also crash the process.
      console.error('Failed to present a branded notification', JSON.stringify(err))
    }
  })
}
