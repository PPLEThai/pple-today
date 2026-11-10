import type { TrayInteraction } from '@pple-today/api-common/dtos'
import { NotificationInAppType, NotificationTokenPlatform } from '@pple-today/database/prisma'

import { type StoredInteraction, trayShape } from '../modules/notification/interaction'
import { deviceHash, mintResponseToken } from '../modules/notification/response-token'

/** A response token with no interaction expiry lives this long (see the spec). */
const DEFAULT_RESPONSE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** One device, and what its install can be told apart by. */
export interface PushToken {
  token: string
  /** The owner. The tray response token is minted per recipient, so it travels with the device. */
  userId: string
  /** Null for tokens registered before the platform was recorded. */
  platform: NotificationTokenPlatform | null
  /** Whether this build can render a branded notification from a data message. */
  supportsAppBranding: boolean
  /** Whether this build can show interaction actions on the OS notification and submit them. */
  supportsTrayInteraction: boolean
  /** iOS Live Activity push-to-start token (hex), when the build reported one. */
  liveActivityStartToken?: string | null
  /** Whether the user allows Live Activities. */
  liveActivitiesEnabled?: boolean
}

/** The app a notification is attributed to, as the push needs to name it. */
export interface PushSenderApp {
  name: string
  /** Raw `MiniApp.icon` — may be null, or a legacy base64 data URI. */
  icon: string | null
}

export interface PushNotificationContent {
  title: string
  message: string
  image?: string
  notificationId?: string
  link?:
    | {
        type: 'MINI_APP' | 'EXTERNAL_BROWSER'
        destination: string
        bypassNotificationCenter?: boolean
      }
    | {
        type: 'IN_APP_NAVIGATION'
        destination: {
          inAppType: NotificationInAppType | 'NOTIFICATION'
          inAppId: string
        }
        bypassNotificationCenter?: boolean
      }
  /** Absent for PPLE Today's own notifications, which stay platform-branded. */
  app?: PushSenderApp
  /**
   * What the recipient's app-icon badge should read once this push lands —
   * their unread total, this notification included.
   *
   * The only per-*recipient* field on an otherwise per-send payload, because a
   * badge is a property of the person, not of the notification: the same
   * broadcast leaves one user on 1 and another on 12. The client keeps the badge
   * in step while the app is open (`AppIconBadgeSync`); this is what keeps it
   * honest while the app is closed, which is most of the time.
   *
   * Omitted when the count could not be read — see `sendNotificationToUser`.
   * An absent badge leaves whatever the OS is already showing, which is a
   * staler number but never a wrong-looking zero.
   */
  unreadCount?: number
  /**
   * Present on an interactive send. The full spec never travels in the push:
   * only the server-computed tray shape does (`pple_interaction`), with a
   * per-recipient response token (`pple_response_token`).
   */
  interaction?: { spec: StoredInteraction; expiresAt: Date | null }
}

/** What `buildFcmMessage` needs beyond the message itself. */
export interface BuildFcmMessageOptions {
  androidBrandedPushDisabled: boolean
  /** `TRAY_INTERACTION_DISABLED`: no tray data for anyone. */
  trayInteractionDisabled?: boolean
  /** `NOTIFICATION_RESPONSE_TOKEN_SECRET`. Unset means no tray data, since the token cannot be minted. */
  responseTokenSecret?: string
  /** Injected so expiry is testable. */
  now?: Date
}

export interface FcmMessage {
  token: string
  notification?: { title: string; body: string }
  data: Record<string, string>
  apns?: {
    payload: {
      aps: {
        'mutable-content': 1
        alert?: { title: string; body: string; subtitle: string }
        badge?: number
      }
    }
    fcm_options?: { image?: string }
  }
  android?: {
    priority?: 'HIGH'
    notification?: { click_action: string; image?: string; notification_count?: number }
  }
}

/**
 * The icon as FCM can actually use it, or nothing.
 *
 * FCM fetches the image itself, so it needs a URL it can reach: a null icon and
 * a legacy base64 data URI are both unusable. The two halves of an app's
 * identity fail independently — an app with no fetchable icon still gets its
 * name — so this returns `undefined` rather than failing the attribution.
 */
const fetchableIcon = (icon: string | null | undefined) =>
  icon && !icon.startsWith('data:') ? icon : undefined

/**
 * Build the FCM message for one token.
 *
 * Two payload shapes, chosen per token rather than per send:
 *
 * **Today's `notification` payload** — the default, and still what every
 * unattributed send uses. Play services and APNs display it without the app
 * process running, which is why it stays the proven path.
 *
 * **Data-only** — for an attributed send to an Android token whose install has
 * asserted it can render one. The client builds the notification, which is the
 * only way to put a *per-notification* icon in the Android tray. The cost is
 * that FCM has to start the app to deliver it, and Android refuses to start a
 * package in the stopped state — MIUI ships Autostart off and treats
 * swipe-from-Recents as a force-stop, and Oppo/Vivo/Realme behave similarly, so
 * on a meaningful share of Thai handsets this is dropped silently. Confining it
 * to attributed sends keeps general and central-team broadcast traffic on the
 * proven path, and `androidBrandedPushDisabled` withdraws it entirely.
 *
 * iOS needs no such bargain: `aps.alert.subtitle` and `fcm_options.image` are
 * read by the existing Notification Service Extension, so branding lands there
 * with no app release — including on tokens registered before this change,
 * whose platform is unknown and which are therefore treated as "not Android".
 */
export const buildFcmMessage = (
  target: PushToken,
  data: PushNotificationContent,
  options: BuildFcmMessageOptions
): FcmMessage => {
  const app = data.app
  const isAndroid = target.platform === NotificationTokenPlatform.ANDROID
  const appIconUrl = app ? fetchableIcon(app.icon) : undefined
  const badge = data.unreadCount
  const brandedAndroid =
    isAndroid &&
    app !== undefined &&
    target.supportsAppBranding &&
    !options.androidBrandedPushDisabled

  // These key names are a contract with the mobile client, which restates them in
  // `apps-client/mobile/utils/branded-push.ts` — sharing them would drag Elysia and
  // the Prisma client into a React Native bundle. Change one side, change the other.
  const baseData: Record<string, string> = {
    link: data.link ? JSON.stringify(data.link) : '',
    ...(data.notificationId ? { notificationId: data.notificationId } : {}),
    // The app's identity, on every attributed send rather than only the
    // data-only one. The client builds the foreground toast from the message it
    // receives on both platforms, and `aps.alert.subtitle` is not readable as
    // data — so a notification the OS brands but the toast does not would look
    // like two different senders depending on whether the app was open.
    ...(app ? { appName: app.name } : {}),
    ...(appIconUrl ? { appIconUrl } : {}),
    // The badge as data, on every payload rather than only the data-only one.
    // `aps.badge` and `notification_count` are applied by the OS but cannot be
    // read back, so this is the only place a foregrounded client can learn the
    // authoritative count — otherwise it is left incrementing a local guess.
    ...(badge !== undefined ? { badge: String(badge) } : {}),
    ...trayData(target, data, options, brandedAndroid),
  }

  if (brandedAndroid) {
    return {
      token: target.token,
      // No `notification` block: its presence is what makes Play services
      // display the message itself, leaving the client nothing to brand.
      //
      // These keys are the contract with the Android display path: it reads
      // `title`/`body` for the notification, and `appName`/`appIconUrl` from
      // `baseData` for the sub-text and the per-notification large icon.
      data: {
        ...baseData,
        title: data.title,
        body: data.message,
        // The badge rides in `baseData`, and here it is the *only* carrier:
        // `android.notification.notification_count` needs a `notification`
        // block, and this payload is data-only precisely to avoid one. So this
        // is the one payload whose badge the client must apply by hand — see
        // `presentBrandedPush`.
        //
        // The content image is deliberately absent. This is the one payload
        // where the app icon and the content image would compete for the same
        // large-icon slot, and the app icon wins; a carve-out for image
        // notifications would drop attribution from exactly the notifications
        // most worth attributing. The image still renders in the notification
        // centre and on the detail screen.
      },
      // A data-only message is delivered to a dozing device only at high
      // priority; at normal priority it may simply never arrive.
      android: { priority: 'HIGH' },
    }
  }

  // Today's payload. `apns` is inert on Android and `android` on iOS, so a
  // token of unknown platform safely carries both.
  const message: FcmMessage = {
    token: target.token,
    notification: {
      title: data.title,
      body: data.message,
    },
    data: baseData,
    apns: {
      payload: {
        aps: {
          'mutable-content': 1,
          // APNs applies this itself, without waking the app — which is the
          // whole reason the badge is set here and not left to the client.
          badge,
        },
      },
      fcm_options: {
        image: data.image,
      },
    },
    android: {
      notification: {
        // Android has no OS-level badge count: launchers that badge at all read
        // this, and the rest show their usual dot. Harmless where unsupported.
        notification_count: badge,
        // Kept even for an attributed send. `android.notification.image` is the
        // *expanded* big picture, not the collapsed icon slot — that slot is
        // the large icon, which FCM cannot set per notification at all, which
        // is the whole reason the branded path has to be data-only. So there is
        // no slot here for the app icon to win, and dropping the content image
        // would lose the big picture for nothing.
        click_action: '.MainActivity',
        image: data.image,
      },
    },
  }

  if (app && !isAndroid) {
    // `aps.alert` is spelled out in full rather than left to FCM's mapping of
    // the common `notification` block, so the title and body cannot be lost to
    // however that merge is resolved.
    message.apns = {
      payload: {
        aps: {
          'mutable-content': 1,
          alert: { title: data.title, body: data.message, subtitle: app.name },
          badge,
        },
      },
      // `fcm_options.image` *is* the collapsed thumbnail on iOS, so here the
      // app icon really does displace the content image. When it is not
      // fetchable the slot is left empty and the default app icon shows, rather
      // than handing it back to the image the app icon was displacing.
      fcm_options: { image: appIconUrl },
    }
  }

  return message
}

/**
 * The two tray data keys for one token, or nothing.
 *
 * Only for a token that asserted `supportsTrayInteraction` and whose payload the
 * client can actually turn into tray actions: iOS (the Notification Service
 * Extension and category), or Android on the data-only branded path, where the
 * client builds the notification itself. An Android token on the legacy
 * `notification` payload is displayed by Play services with no code of ours, so
 * it gets no tray data. Only while the tray
 * is not switched off, only while the interaction is still open, and only when
 * the interaction's shape gets tray actions (`trayShape`; otherwise a tap opens
 * the form). Both values are strings, because FCM `data` values must be. The
 * token expires with the interaction, or after 30 days when it has no expiry.
 *
 * These key names are a contract with the mobile client
 * (`apps-client/mobile/libs/notification-display.ts`).
 */
const trayData = (
  target: PushToken,
  data: PushNotificationContent,
  options: BuildFcmMessageOptions,
  brandedAndroid: boolean
): Record<string, string> => {
  const { interaction, notificationId } = data
  if (!interaction || !notificationId) return {}
  if (!target.supportsTrayInteraction || options.trayInteractionDisabled) return {}
  const trayCapable =
    target.platform === NotificationTokenPlatform.IOS ||
    (target.platform === NotificationTokenPlatform.ANDROID && brandedAndroid)
  if (!trayCapable) return {}
  if (!options.responseTokenSecret) return {}

  const now = options.now ?? new Date()
  if (interaction.expiresAt && interaction.expiresAt.getTime() <= now.getTime()) return {}

  const shape = trayShape(interaction.spec)
  if (!shape) return {}

  const expiresAtMs =
    interaction.expiresAt?.getTime() ?? now.getTime() + DEFAULT_RESPONSE_TOKEN_TTL_MS
  const tray = { id: notificationId, ...shape } as TrayInteraction

  return {
    pple_interaction: JSON.stringify(tray),
    pple_response_token: mintResponseToken(
      {
        notificationId,
        userId: target.userId,
        exp: Math.floor(expiresAtMs / 1000),
        deviceHash: deviceHash(target.token),
      },
      options.responseTokenSecret
    ),
  }
}

/**
 * A data-only message that tells an Android device to remove an answered
 * notification from its tray (`pple_dismiss`). High priority, because a
 * data-only message to a dozing device is otherwise delayed or dropped.
 */
export const buildDismissMessage = (token: string, notificationId: string): FcmMessage => ({
  token,
  data: { pple_dismiss: notificationId },
  android: { priority: 'HIGH' },
})

/** The `content-state` of a Live Activity: what changes after the start. */
export type LiveActivityContentState =
  | { status: 'open' }
  | { status: 'answered'; label: string }
  | { status: 'closed' }
  | { status: 'expired' }

/** What `buildLiveActivityStart` needs beyond the target and content. */
export interface BuildLiveActivityStartOptions {
  /** `LIVE_ACTIVITY_DISABLED`. */
  liveActivityDisabled?: boolean
  /** `NOTIFICATION_RESPONSE_TOKEN_SECRET`. Unset means no Live Activity: the token cannot be minted. */
  responseTokenSecret?: string
  /** Injected so expiry is testable. */
  now?: Date
}

/** An FCM HTTP v1 message carrying an ActivityKit push through `apns.live_activity_token`. */
export interface LiveActivityMessage {
  token: string
  apns: {
    live_activity_token: string
    headers: { 'apns-priority': '10' }
    payload: { aps: Record<string, unknown> }
  }
}

/** How long an ended activity stays on the Lock Screen showing its final status. */
const LIVE_ACTIVITY_DISMISSAL_MS = 15 * 60 * 1000

const unixSeconds = (d: Date) => Math.floor(d.getTime() / 1000)

/**
 * Whether this token gets a Live Activity instead of the normal push: the send
 * opted in, the interaction is open, and the token is an iOS install that can
 * show tray buttons, holds a push-to-start token and has Live Activities
 * allowed, with neither kill switch nor missing secret in the way.
 */
export const qualifiesForLiveActivity = (
  target: PushToken,
  data: PushNotificationContent,
  options: BuildLiveActivityStartOptions
): boolean => {
  const { interaction, notificationId } = data
  if (!interaction || !notificationId || interaction.spec.liveActivity !== true) return false
  if (options.liveActivityDisabled || !options.responseTokenSecret) return false
  if (target.platform !== NotificationTokenPlatform.IOS) return false
  if (!target.supportsTrayInteraction) return false
  if (!target.liveActivityStartToken || !target.liveActivitiesEnabled) return false
  const now = options.now ?? new Date()
  // A Live Activity always has an expiry (validated at send); without one there is no stale-date.
  if (!interaction.expiresAt || interaction.expiresAt.getTime() <= now.getTime()) return false
  return trayShape(interaction.spec)?.kind === 'buttons'
}

/**
 * The push-to-start message for one token, or null when the token does not
 * qualify (see `qualifiesForLiveActivity`) and should get the normal push.
 *
 * Attributes are fixed for the life of the activity, so everything static goes
 * there, including the same per-recipient response token the tray uses.
 * `attributes-type` must match the Swift struct name.
 */
export const buildLiveActivityStart = (
  target: PushToken,
  data: PushNotificationContent,
  options: BuildLiveActivityStartOptions
): LiveActivityMessage | null => {
  if (!qualifiesForLiveActivity(target, data, options)) return null
  const { interaction, notificationId } = data
  const shape = trayShape(interaction!.spec)
  if (!interaction || !notificationId || !shape || shape.kind !== 'buttons') return null
  const now = options.now ?? new Date()
  const expiresAt = interaction.expiresAt!
  const expiresAtSeconds = unixSeconds(expiresAt)

  const responseToken = mintResponseToken(
    {
      notificationId,
      userId: target.userId,
      exp: expiresAtSeconds,
      deviceHash: deviceHash(target.token),
    },
    options.responseTokenSecret!
  )

  return {
    token: target.token,
    apns: {
      live_activity_token: target.liveActivityStartToken!,
      headers: { 'apns-priority': '10' },
      payload: {
        aps: {
          timestamp: unixSeconds(now),
          event: 'start',
          'attributes-type': 'PPLEInteractionAttributes',
          attributes: {
            notificationId,
            appName: data.app?.name ?? 'PPLE Today',
            header: data.title,
            message: data.message,
            actions: shape.actions,
            responseToken,
          },
          'content-state': { status: 'open' } satisfies LiveActivityContentState,
          'stale-date': expiresAtSeconds,
          'input-push-token': 1,
          alert: { title: data.title, body: data.message },
        },
      },
    },
  }
}

/**
 * The end message for one started activity: the device's FCM token plus the
 * activity's own update token, with the final `content-state`. The activity
 * stays on screen for 15 minutes showing that state, then iOS removes it.
 */
export const buildLiveActivityEnd = (input: {
  deviceToken: string
  pushToken: string
  state: LiveActivityContentState
  now?: Date
}): LiveActivityMessage => {
  const now = input.now ?? new Date()
  return {
    token: input.deviceToken,
    apns: {
      live_activity_token: input.pushToken,
      headers: { 'apns-priority': '10' },
      payload: {
        aps: {
          timestamp: unixSeconds(now),
          event: 'end',
          'content-state': input.state,
          'dismissal-date': unixSeconds(new Date(now.getTime() + LIVE_ACTIVITY_DISMISSAL_MS)),
        },
      },
    },
  }
}
