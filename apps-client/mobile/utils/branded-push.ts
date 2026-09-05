/**
 * Reads an incoming push for the app that sent it.
 *
 * The keys are the other half of a contract written in
 * `apps-api/backoffice/src/utils/push-payload.ts` — `title`, `body`, `appName`,
 * `appIconUrl`, `link`, `notificationId`, `badge`. They are restated here rather
 * than shared from `@pple-today/api-common`, because that package is built on Elysia
 * and the Prisma client and has no business in a React Native bundle for the sake
 * of seven string literals. Change one side and you must change the other; the
 * comment on `baseData` in that file points back here.
 */

/**
 * The app a notification came from, as the client renders it.
 *
 * Declared structurally so one component can brand a notification whether it
 * arrived as a push or came back from `/notifications/history` as the API's
 * `NotificationSenderApp`. `branded-push.test.ts` asserts the two stay assignable,
 * and fails `bun run typecheck` if they ever diverge.
 */
export interface PushSenderApp {
  name: string
  iconUrl?: string
}

/**
 * The notification an attributed, data-only Android push becomes.
 *
 * The server sends no `notification` block for an attributed send to a build that
 * asserted `supportsAppBranding`, because a message Play services displays itself
 * leaves the client nothing to brand. Everything the tray needs therefore arrives
 * in `data`, and this is the shape it maps onto.
 */
export interface BrandedPushNotification {
  title: string
  body: string
  /** Android sub-text: the name of the app that sent the notification. */
  subtitle: string
  /** Per-notification large icon. Absent when the app has no fetchable icon. */
  largeIconUrl?: string
  /**
   * Carried onto the presented notification so a tap resolves the same
   * destination an FCM-displayed one would.
   */
  data: Record<string, string>
  /**
   * What the app-icon badge should read once this notification is presented.
   *
   * Every other payload leaves the badge to the OS — APNs applies `aps.badge`
   * and Play services `notification_count` without the app running. This one is
   * displayed by the client, so the client sets the badge too. Absent when the
   * server could not read the count.
   */
  badgeCount?: number
}

/**
 * An FCM data payload as a map, or `undefined` if it is not one.
 *
 * RNFB types `data` as `Record<string, string | object>` and `expo-notifications`
 * as unknown values, so nothing guarantees a plain map of strings here.
 */
const asDataMap = (payload: unknown): Record<string, unknown> | undefined =>
  typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : undefined

const stringField = (data: Record<string, unknown>, key: string): string | undefined => {
  const value = data[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * The recipient's unread total as of this push, or `undefined` if it carries
 * none.
 *
 * Present on every payload, attributed or not. `aps.badge` and Android's
 * `notification_count` are applied by the OS but cannot be read back, so this
 * is the only way a running client learns the authoritative count instead of
 * incrementing a local guess.
 *
 * Data payloads are strings on the wire, so the number has to survive a parse.
 * Anything that is not a whole count — a negative, a decimal, a non-number — is
 * dropped rather than clamped: leaving the badge as it stands beats setting it
 * to a value the server did not mean.
 */
export function pushBadgeCount(payload: unknown): number | undefined {
  const data = asDataMap(payload)
  if (!data) {
    return undefined
  }
  const raw = stringField(data, 'badge')
  if (raw === undefined) {
    return undefined
  }
  const value = Number(raw)
  return Number.isInteger(value) && value >= 0 ? value : undefined
}

/**
 * The app an incoming push is attributed to, or `undefined` for one of PPLE
 * Today's own.
 *
 * Every attributed send carries these keys, whatever payload shape it took — an
 * iOS push keeps its `notification` block and puts the name in
 * `aps.alert.subtitle`, which is not readable as data, so this is the only place
 * its foreground toast can learn who sent it.
 */
export function pushSenderApp(payload: unknown): PushSenderApp | undefined {
  const data = asDataMap(payload)
  if (!data) {
    return undefined
  }

  const name = stringField(data, 'appName')
  if (!name) {
    return undefined
  }
  return { name, iconUrl: stringField(data, 'appIconUrl') }
}

/**
 * Read an incoming FCM data payload as a branded notification, or `null` if it is
 * not one.
 *
 * Only an attributed send goes data-only, so a data message that names no app is
 * not ours to display — presenting it would put a blank notification in the tray.
 * `title` is required for the same reason. `body` is not: it is the one field a
 * notification can plausibly do without, and an empty line is better than
 * dropping the notification.
 */
export function parseBrandedPush(payload: unknown): BrandedPushNotification | null {
  const data = asDataMap(payload)
  if (!data) {
    return null
  }

  const title = stringField(data, 'title')
  const app = pushSenderApp(data)
  if (!title || !app) {
    return null
  }

  const link = stringField(data, 'link')
  const notificationId = stringField(data, 'notificationId')

  return {
    title,
    body: stringField(data, 'body') ?? '',
    subtitle: app.name,
    largeIconUrl: app.iconUrl,
    data: {
      ...(link ? { link } : {}),
      ...(notificationId ? { notificationId } : {}),
    },
    badgeCount: pushBadgeCount(data),
  }
}
