import { NotificationInAppType, NotificationTokenPlatform } from '@pple-today/database/prisma'

/** One device, and what its install can be told apart by. */
export interface PushToken {
  token: string
  /** Null for tokens registered before the platform was recorded. */
  platform: NotificationTokenPlatform | null
  /** Whether this build can render a branded notification from a data message. */
  supportsAppBranding: boolean
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
}

interface FcmMessage {
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
  options: { androidBrandedPushDisabled: boolean }
): FcmMessage => {
  const app = data.app
  const isAndroid = target.platform === NotificationTokenPlatform.ANDROID
  const appIconUrl = app ? fetchableIcon(app.icon) : undefined
  const badge = data.unreadCount

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
  }
  const brandedAndroid =
    isAndroid &&
    app !== undefined &&
    target.supportsAppBranding &&
    !options.androidBrandedPushDisabled

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
