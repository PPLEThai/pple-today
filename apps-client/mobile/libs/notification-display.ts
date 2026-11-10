import { AppState, Platform } from 'react-native'

import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging'
import * as Notifications from 'expo-notifications'
import * as TaskManager from 'expo-task-manager'

import { environment } from '@app/env'
import { endAllLiveActivities } from '@app/libs/live-activity'
import { BrandedPushNotification, parseBrandedPush } from '@app/utils/branded-push'
import {
  buildTrayCategory,
  isTrayCategory,
  MAX_TRAY_CATEGORIES,
  outcomeForStatus,
  parseDismiss,
  parseTrayInteraction,
  selectCategoriesToKeep,
  selectCategoriesToPrune,
  selectInteractiveToDismiss,
  submissionFromResponse,
  tapToDetailData,
  trayCategoryId,
  TrayInteraction,
  trayNotificationData,
  trayNotificationIdentifier,
  TrayResponseInput,
  TraySubmission,
} from '@app/utils/tray-interaction'

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
export async function presentBrandedPush(
  notification: BrandedPushNotification,
  tray?: { interaction: TrayInteraction; notificationId: string }
) {
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
      // Interactive: the actions live on a category registered just before, and
      // the notification gets a stable identifier so a later result or dismiss
      // can replace or remove exactly this one.
      ...(tray ? { categoryIdentifier: trayCategoryId(tray.interaction.id) } : {}),
    },
    ...(tray ? { identifier: trayNotificationIdentifier(tray.notificationId) } : {}),
    // Names the channel rather than passing `null`: a null trigger would send the
    // notification to `expo-notifications`' fallback channel — a second entry in
    // system settings — and log an error on the way.
    trigger: { channelId: DEFAULT_NOTIFICATION_CHANNEL_ID },
  })
  // The app-icon badge, for the one payload nothing else badges: a data-only
  // message carries no `notification` block, so Play services never sees the
  // `notification_count` it would otherwise read. Set after presenting, so a
  // failure here costs the badge and not the notification.
  if (notification.badgeCount !== undefined) {
    try {
      await Notifications.setBadgeCountAsync(notification.badgeCount)
    } catch (err) {
      console.error('Failed to set the app icon badge', JSON.stringify(err))
    }
  }
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
    // A dismiss for a card another device already answered. Data-only and
    // carrying no title, so it has to be read before `parseBrandedPush`.
    const dismissId = parseDismiss(remoteMessage.data)
    if (dismissId) {
      await dismissTrayNotification(dismissId)
      return
    }
    const notification = parseBrandedPush(remoteMessage.data)
    if (!notification) {
      return
    }
    try {
      const prepared = await prepareTrayInteraction(notification, remoteMessage.data)
      await presentBrandedPush(prepared.notification, prepared.tray)
    } catch (err) {
      // Losing the notification is the worst outcome available here; throwing
      // out of a headless task would also crash the process.
      console.error('Failed to present a branded notification', JSON.stringify(err))
    }
  })
}

// ---------------------------------------------------------------------------
// Tray interaction (docs/interactive-notifications.md, "Answering from the
// notification tray"). Android only here: on iOS the Notification Service
// Extension registers the category and `modules/notification-actions` submits.
// ---------------------------------------------------------------------------

/** Name of the task `expo-notifications` runs for tray action presses. */
export const TRAY_ACTION_TASK = 'pple-tray-action'

const SUBMIT_TIMEOUT_MS = 15_000

const asString = (value: unknown) => (typeof value === 'string' && value ? value : undefined)

/**
 * Register the category and build the notification for an interactive push. An
 * ordinary push comes back unchanged with no `tray`. Failing to register the
 * category is not fatal: the notification is then shown without actions, and
 * tapping it opens the form.
 */
async function prepareTrayInteraction(
  notification: BrandedPushNotification,
  payload: unknown
): Promise<{
  notification: BrandedPushNotification
  tray?: { interaction: TrayInteraction; notificationId: string }
}> {
  const data =
    typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {}
  const rawInteraction = asString(data['pple_interaction'])
  const interaction = parseTrayInteraction(rawInteraction)
  const notificationId = asString(data['notificationId'])
  // The identifier below is derived from the notification id, so both have to be
  // there for the notification to be addressable later.
  if (!rawInteraction || !interaction || !notificationId) {
    return { notification }
  }
  const categoryId = trayCategoryId(interaction.id)
  try {
    await Notifications.setNotificationCategoryAsync(
      categoryId,
      buildTrayCategory(interaction).actions
    )
  } catch (err) {
    console.error('Failed to register a notification category', JSON.stringify(err))
    return { notification }
  }
  pruneTrayCategories(categoryId).catch((err) => {
    console.error('Failed to prune notification categories', JSON.stringify(err))
  })
  return {
    notification: {
      ...notification,
      data: trayNotificationData(notification.data, {
        interaction: rawInteraction,
        token: asString(data['pple_response_token']),
        appIconUrl: notification.largeIconUrl,
      }),
    },
    tray: { interaction, notificationId },
  }
}

/**
 * Delete `pple.ix.*` categories beyond the newest 50. A category is kept while
 * its notification is in the tray; see `selectCategoriesToPrune`.
 */
async function pruneTrayCategories(justRegistered: string) {
  const categories = await Notifications.getNotificationCategoriesAsync()
  const all = categories.map((category) => category.identifier)
  if (all.filter(isTrayCategory).length <= MAX_TRAY_CATEGORIES) {
    return
  }
  const presented = await Notifications.getPresentedNotificationsAsync()
  const inTray = presented
    .map((n) => n.request.content.categoryIdentifier)
    .filter((id): id is string => typeof id === 'string')
  for (const id of selectCategoriesToPrune(all, [...inTray, justRegistered])) {
    await Notifications.deleteNotificationCategoryAsync(id)
  }
}

/** Remove a presented interactive notification, e.g. one answered on another device. */
export async function dismissTrayNotification(notificationId: string) {
  try {
    await Notifications.dismissNotificationAsync(trayNotificationIdentifier(notificationId))
  } catch (err) {
    console.error('Failed to dismiss a notification', JSON.stringify(err))
  }
}

/**
 * On logout, take every interactive card out of the tray and delete the
 * `pple.ix.*` categories. The server also refuses their tokens once the device is
 * unregistered; this is the UX half. Never throws.
 */
export async function clearInteractiveNotifications() {
  // iOS Live Activities are interactive cards too (a no-op elsewhere).
  endAllLiveActivities()
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return
  }
  try {
    const presented = await Notifications.getPresentedNotificationsAsync()
    const ids = selectInteractiveToDismiss(
      presented.map((n) => ({
        identifier: n.request.identifier,
        categoryIdentifier: n.request.content.categoryIdentifier,
        data: n.request.content.data,
      })),
      Platform.OS
    )
    for (const id of ids) {
      await Notifications.dismissNotificationAsync(id).catch((err) => {
        console.error('Failed to dismiss an interactive notification', JSON.stringify(err))
      })
    }
  } catch (err) {
    console.error('Failed to clear interactive notifications', JSON.stringify(err))
  }
  try {
    // Deleting the `pple.ix.*` categories one by one leaves every other category
    // as it was. A set-the-whole-list API would need the merge done by hand.
    const categories = await Notifications.getNotificationCategoriesAsync()
    const keep = new Set(selectCategoriesToKeep(categories).map((c) => c.identifier))
    for (const category of categories) {
      if (!keep.has(category.identifier)) {
        await Notifications.deleteNotificationCategoryAsync(category.identifier)
      }
    }
  } catch (err) {
    console.error('Failed to delete interactive notification categories', JSON.stringify(err))
  }
}

/**
 * POST the answer. Resolves with the HTTP status, or `undefined` for a network
 * error or timeout. Never throws, and is never retried: a lost answer is the
 * user's to repeat, and the failure message says so.
 */
export async function submitTrayAnswer(submission: TraySubmission): Promise<number | undefined> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS)
  try {
    const base = environment.EXPO_PUBLIC_BACKEND_BASE_URL.replace(/\/+$/, '')
    const response = await fetch(
      `${base}/notifications/${encodeURIComponent(submission.notificationId)}/response`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Notification-Response-Token': submission.token,
        },
        body: JSON.stringify(submission.body),
        signal: controller.signal,
      }
    )
    return response.status
  } catch {
    return undefined
  } finally {
    clearTimeout(timer)
  }
}

/** The notification response as the pure module wants it. */
export function toTrayResponseInput(
  response: Notifications.NotificationResponse
): TrayResponseInput {
  const content = response.notification.request.content
  const trigger = response.notification.request.trigger as {
    type?: string
    payload?: unknown
  } | null
  // iOS reads a remote push's `data` from a `body` key that FCM does not send, so
  // for those the keys are in the raw payload instead.
  let data: Record<string, unknown> | undefined = content.data
  if ((!data || Object.keys(data).length === 0) && trigger?.type === 'push') {
    const payload = trigger.payload
    if (typeof payload === 'object' && payload !== null) {
      data = payload as Record<string, unknown>
    }
  }
  let categoryIdentifier = content.categoryIdentifier
  if (!categoryIdentifier) {
    const interaction = parseTrayInteraction(data?.['pple_interaction'])
    categoryIdentifier = interaction ? trayCategoryId(interaction.id) : null
  }
  return {
    actionIdentifier: response.actionIdentifier,
    userText: response.userText,
    categoryIdentifier,
    data,
  }
}

// Presses already handled in this JS runtime. `expo-notifications` replays a
// response that arrived with no listener attached, and the background task and
// the foreground listener can both see one in a process that stays alive.
const handledPresses = new Set<string>()

/**
 * Submit a tray action press and show the outcome. Resolves `false` when the
 * press is not one to submit from here (so the caller can route it instead).
 */
export async function handleTrayActionResponse(
  response: Notifications.NotificationResponse
): Promise<boolean> {
  const input = toTrayResponseInput(response)
  const submission = submissionFromResponse(input)
  if (!submission) {
    return false
  }
  const identifier =
    asString(response.notification.request.identifier) ??
    trayNotificationIdentifier(submission.notificationId)
  const key = `${identifier}:${response.actionIdentifier}`
  if (handledPresses.has(key)) {
    return true
  }
  handledPresses.add(key)

  const outcome = outcomeForStatus(await submitTrayAnswer(submission))
  try {
    if (outcome.kind === 'dismiss') {
      await Notifications.dismissNotificationAsync(identifier)
      return true
    }
    // Only replace a notification that is still in the tray. One that is gone has
    // been dismissed by the user or by an earlier press, and bringing it back with
    // a "you already answered" would be noise.
    const presented = await Notifications.getPresentedNotificationsAsync()
    if (!presented.some((n) => n.request.identifier === identifier)) {
      return true
    }
    await ensureDefaultNotificationChannel()
    const content = response.notification.request.content
    // No category, no token: nothing left to press, and a tap still opens the detail.
    const data = tapToDetailData(input.data)
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: content.title ?? undefined,
        body: outcome.message,
        subtitle: content.subtitle ?? undefined,
        largeIconUrl: data['appIconUrl'],
        data,
      },
      trigger: { channelId: DEFAULT_NOTIFICATION_CHANNEL_ID },
    })
  } catch (err) {
    console.error('Failed to update a notification after answering', JSON.stringify(err))
  }
  return true
}

/**
 * Handle tray action presses while the app is backgrounded or killed.
 *
 * On Android `expo-notifications` runs this task for an action press only when
 * the app is not in the foreground. It is defined and registered at module scope
 * from `index.js` because the task starts the bundle headless, with no root view
 * and so no route module evaluated.
 */
export function registerTrayInteractionTask() {
  if (Platform.OS !== 'android') {
    return
  }
  TaskManager.defineTask<Notifications.NotificationTaskPayload>(
    TRAY_ACTION_TASK,
    async ({ data, error }) => {
      if (error || !data || !('actionIdentifier' in data)) {
        return
      }
      try {
        await handleTrayActionResponse(data)
      } catch (err) {
        console.error('Failed to handle a notification action', JSON.stringify(err))
      }
    }
  )
  Notifications.registerTaskAsync(TRAY_ACTION_TASK).catch((err) => {
    console.error('Failed to register the notification action task', JSON.stringify(err))
  })
}

/**
 * Handle tray action presses while the app is in the foreground. Android only:
 * on iOS the native module submits, and `expo-notifications` hands the same
 * response to JS, which must leave it alone.
 *
 * `expo-notifications` runs the background task instead whenever the app is not
 * in the foreground, so a response that reaches this listener in any other state
 * is a replay of one the task has already handled.
 */
export function addTrayActionListener() {
  if (Platform.OS !== 'android') {
    return { remove() {} }
  }
  return Notifications.addNotificationResponseReceivedListener((response) => {
    if (AppState.currentState !== 'active') {
      return
    }
    handleTrayActionResponse(response).catch((err) => {
      console.error('Failed to handle a notification action', JSON.stringify(err))
    })
  })
}
