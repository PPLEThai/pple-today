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
      }
    }
    fcm_options?: { image?: string }
  }
  android?: {
    priority?: 'HIGH'
    notification?: { click_action: string; image?: string }
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
  const baseData: Record<string, string> = {
    link: data.link ? JSON.stringify(data.link) : '',
    ...(data.notificationId ? { notificationId: data.notificationId } : {}),
  }

  const isAndroid = target.platform === NotificationTokenPlatform.ANDROID
  const brandedAndroid =
    isAndroid &&
    data.app !== undefined &&
    target.supportsAppBranding &&
    !options.androidBrandedPushDisabled

  if (brandedAndroid) {
    const iconUrl = fetchableIcon(data.app!.icon)

    return {
      token: target.token,
      // No `notification` block: its presence is what makes Play services
      // display the message itself, leaving the client nothing to brand.
      data: {
        ...baseData,
        title: data.title,
        body: data.message,
        appName: data.app!.name,
        ...(iconUrl ? { appIconUrl: iconUrl } : {}),
        // The content image is deliberately absent. Both platforms show one
        // thumbnail, the app icon has claimed it, and a carve-out for image
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
        },
      },
      fcm_options: {
        image: data.image,
      },
    },
    android: {
      notification: {
        click_action: '.MainActivity',
        image: data.image,
      },
    },
  }

  if (data.app && !isAndroid) {
    // `aps.alert` is spelled out in full rather than left to FCM's mapping of
    // the common `notification` block, so the title and body cannot be lost to
    // however that merge is resolved.
    message.apns = {
      payload: {
        aps: {
          'mutable-content': 1,
          alert: { title: data.title, body: data.message, subtitle: data.app.name },
        },
      },
      // The app icon takes the thumbnail; when it is not fetchable the slot is
      // left empty so the default app icon shows, rather than handing it to the
      // content image the app icon was displacing.
      fcm_options: { image: fetchableIcon(data.app.icon) },
    }
  }

  return message
}
