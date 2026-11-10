/**
 * Pure logic for answering an interactive notification from the OS tray.
 * See docs/interactive-notifications.md, "Answering from the notification tray".
 *
 * The types below mirror `TrayInteraction` in `@pple-today/api-common`. They are
 * restated here, as `branded-push.ts` does, because that package is built on
 * Elysia and Prisma and has no business in a React Native bundle. Change one
 * side and you must change the other. The iOS Notification Service Extension
 * (`assets/NotificationService.m`) and the iOS native submit
 * (`modules/notification-actions`) read the same payload and must stay in step.
 */

export const TRAY_CATEGORY_PREFIX = 'pple.ix.'
/** How many `pple.ix.*` categories to keep. Past this the oldest are pruned. */
export const MAX_TRAY_CATEGORIES = 50
/** Category of the local notification that reports a failed tray answer on iOS. */
export const TRAY_RESULT_CATEGORY = 'pple.result'

/**
 * Master switch for tray interaction on this build. `false` stops the build
 * asserting `supportsTrayInteraction` at registration, so the server sends it no
 * tray data and its notifications fall back to tap-to-open. Flip it and ship, or
 * use the server's `TRAY_INTERACTION_DISABLED`, which needs no release.
 */
export const TRAY_INTERACTION_ENABLED = true

/**
 * Whether this build should assert `supportsTrayInteraction`: Android has the
 * background task and listener, iOS has the extension and the native submit.
 */
export function supportsTrayInteraction(platform: string): boolean {
  return TRAY_INTERACTION_ENABLED && (platform === 'android' || platform === 'ios')
}

const ICONS = [
  'check',
  'x',
  'thumbs-up',
  'thumbs-down',
  'calendar-check',
  'calendar-x',
  'clock',
  'send',
  'heart',
  'star',
  'flag',
  'user-check',
  'user-x',
  'help',
] as const
export type TrayIcon = (typeof ICONS)[number]

export interface TrayButtonsInteraction {
  id: string
  kind: 'buttons'
  actions: { id: string; label: string; icon?: TrayIcon; destructive?: boolean; bg: boolean }[]
}
export interface TrayReplyInteraction {
  id: string
  kind: 'reply'
  fieldId: string
  placeholder?: string
  submitLabel: string
  actionId: string
  bg: true
}
export type TrayInteraction = TrayButtonsInteraction | TrayReplyInteraction

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isOptionalString = (v: unknown): v is string | undefined =>
  v === undefined || typeof v === 'string'

/**
 * Read the `pple_interaction` data value (a JSON string on the wire) into a
 * `TrayInteraction`, or `null` if it is absent or malformed.
 *
 * Defensive on purpose: this runs in a headless task where a throw would crash
 * the process, and the payload is the other half of a contract we do not
 * control from here. An unusable payload means "no tray actions", never a
 * dropped notification. Unknown icons are dropped (an older client shows no
 * icon); extra keys are ignored.
 */
export function parseTrayInteraction(raw: unknown): TrayInteraction | null {
  let value: unknown = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!isRecord(value) || !isNonEmptyString(value.id)) {
    return null
  }

  if (value.kind === 'reply') {
    if (
      !isNonEmptyString(value.fieldId) ||
      !isNonEmptyString(value.submitLabel) ||
      !isNonEmptyString(value.actionId) ||
      !isOptionalString(value.placeholder)
    ) {
      return null
    }
    return {
      id: value.id,
      kind: 'reply',
      fieldId: value.fieldId,
      placeholder: value.placeholder,
      submitLabel: value.submitLabel,
      actionId: value.actionId,
      bg: true,
    }
  }

  if (value.kind === 'buttons') {
    if (!Array.isArray(value.actions) || value.actions.length === 0) {
      return null
    }
    const actions: TrayButtonsInteraction['actions'] = []
    const seen = new Set<string>()
    for (const action of value.actions) {
      if (
        !isRecord(action) ||
        !isNonEmptyString(action.id) ||
        !isNonEmptyString(action.label) ||
        typeof action.bg !== 'boolean' ||
        seen.has(action.id)
      ) {
        return null
      }
      seen.add(action.id)
      const icon = (ICONS as readonly unknown[]).includes(action.icon)
        ? (action.icon as TrayIcon)
        : undefined
      actions.push({
        id: action.id,
        label: action.label,
        ...(icon ? { icon } : {}),
        ...(action.destructive === true ? { destructive: true } : {}),
        bg: action.bg,
      })
    }
    return { id: value.id, kind: 'buttons', actions }
  }

  return null
}

export const trayCategoryId = (interactionId: string) => `${TRAY_CATEGORY_PREFIX}${interactionId}`

export const isTrayCategory = (categoryIdentifier: unknown): categoryIdentifier is string =>
  typeof categoryIdentifier === 'string' && categoryIdentifier.startsWith(TRAY_CATEGORY_PREFIX)

/** The shape `Notifications.setNotificationCategoryAsync` takes. */
export interface TrayCategory {
  identifier: string
  actions: {
    identifier: string
    buttonTitle: string
    textInput?: { submitButtonTitle: string; placeholder: string }
    options: {
      opensAppToForeground: boolean
      isDestructive?: boolean
      isAuthenticationRequired?: boolean
    }
  }[]
}

/**
 * The category for one interaction. `opensAppToForeground` follows `bg`; the
 * reply shape is one action carrying a text input. The `isDestructive` and
 * `isAuthenticationRequired` options only affect iOS, which registers its
 * categories in the extension; they are kept here so both sides describe the
 * same thing.
 */
export function buildTrayCategory(interaction: TrayInteraction): TrayCategory {
  if (interaction.kind === 'reply') {
    return {
      identifier: trayCategoryId(interaction.id),
      actions: [
        {
          identifier: interaction.actionId,
          buttonTitle: interaction.submitLabel,
          textInput: {
            submitButtonTitle: interaction.submitLabel,
            placeholder: interaction.placeholder ?? '',
          },
          options: { opensAppToForeground: false, isAuthenticationRequired: true },
        },
      ],
    }
  }
  return {
    identifier: trayCategoryId(interaction.id),
    actions: interaction.actions.map((action) => ({
      identifier: action.id,
      buttonTitle: action.label,
      options: {
        opensAppToForeground: !action.bg,
        isDestructive: action.destructive === true,
        isAuthenticationRequired: true,
      },
    })),
  }
}

/**
 * Which `pple.ix.*` categories to delete.
 *
 * Android can list categories but not say how old they are, so age is not the
 * criterion. A category matters only while its notification could still be
 * pressed, which is while it sits in the tray, so those (and the one just
 * registered) are never pruned. Anything else goes, but only once the total is
 * over `max`, so the common case costs nothing. Ids outside the prefix are never
 * touched.
 */
export function selectCategoriesToPrune(
  allCategoryIds: readonly string[],
  keepCategoryIds: readonly string[],
  max: number = MAX_TRAY_CATEGORIES
): string[] {
  const ours = allCategoryIds.filter(isTrayCategory)
  if (ours.length <= max) {
    return []
  }
  const keep = new Set(keepCategoryIds)
  const candidates = ours.filter((id) => !keep.has(id))
  return candidates.slice(0, Math.min(candidates.length, ours.length - max))
}

export type TrayResultMessage = 'answered' | 'closed' | 'failed'

export const TRAY_RESULT_TEXT: Record<TrayResultMessage, string> = {
  answered: 'คุณตอบกลับแล้ว',
  closed: 'ปิดรับคำตอบแล้ว',
  failed: 'ส่งคำตอบไม่สำเร็จ แตะเพื่อตอบในแอป',
}

export type TrayResultOutcome =
  | { kind: 'dismiss' }
  | { kind: 'replace'; reason: TrayResultMessage; message: string }

/**
 * What to do with the notification after the submit. `status` is the HTTP
 * status, or `undefined` for a network error or timeout. 200 dismisses, 409 and
 * 410 say so, and everything else (400, 401, 5xx, no response) is the generic
 * failure.
 */
export function outcomeForStatus(status: number | undefined): TrayResultOutcome {
  if (status === 200) return { kind: 'dismiss' }
  const reason: TrayResultMessage =
    status === 409 ? 'answered' : status === 410 ? 'closed' : 'failed'
  return { kind: 'replace', reason, message: TRAY_RESULT_TEXT[reason] }
}

export interface TraySubmission {
  notificationId: string
  token: string
  body: { actionId: string; values?: Record<string, string> }
}

/** Minimal view of a notification response, so this module needs no expo types. */
export interface TrayResponseInput {
  actionIdentifier: string
  userText?: string | null
  categoryIdentifier?: string | null
  data: Record<string, unknown> | null | undefined
}

export const DEFAULT_ACTION_IDENTIFIER = 'expo.modules.notifications.actions.DEFAULT'

/**
 * The request a tray action press should send, or `null` if this press is not
 * ours to submit: not a `pple.ix.*` notification, the default (body) tap, an
 * action that opens the app instead, an unknown action, or a payload missing the
 * id or token. A `bg: false` action is deliberately `null`: the app opens and
 * the form submits it.
 */
export function submissionFromResponse(response: TrayResponseInput): TraySubmission | null {
  if (!isTrayCategory(response.categoryIdentifier) || !response.data) {
    return null
  }
  const { notificationId, pple_response_token: token } = response.data
  if (!isNonEmptyString(notificationId) || !isNonEmptyString(token)) {
    return null
  }
  const interaction = parseTrayInteraction(response.data.pple_interaction)
  if (!interaction || trayCategoryId(interaction.id) !== response.categoryIdentifier) {
    return null
  }

  if (interaction.kind === 'reply') {
    if (response.actionIdentifier !== interaction.actionId) return null
    return {
      notificationId,
      token,
      body: {
        actionId: interaction.actionId,
        values: { [interaction.fieldId]: response.userText ?? '' },
      },
    }
  }

  const action = interaction.actions.find((a) => a.id === response.actionIdentifier)
  if (!action || !action.bg) return null
  return { notificationId, token, body: { actionId: action.id } }
}

/**
 * The action to open the form with, when a press is on a `bg: false` action.
 * `undefined` for a default tap, a bg action, or anything not ours.
 */
export function pendingActionFromResponse(response: TrayResponseInput): string | undefined {
  if (!isTrayCategory(response.categoryIdentifier) || !response.data) return undefined
  if (response.actionIdentifier === DEFAULT_ACTION_IDENTIFIER) return undefined
  const interaction = parseTrayInteraction(response.data.pple_interaction)
  if (!interaction || interaction.kind !== 'buttons') return undefined
  const action = interaction.actions.find((a) => a.id === response.actionIdentifier)
  return action && !action.bg ? action.id : undefined
}

/**
 * Data to carry onto a presented interactive notification: the tap-to-detail
 * keys, plus what a later action press needs. The token stays until a result
 * replaces the notification, which keeps only the tap-to-detail keys.
 */
export function trayNotificationData(
  data: Record<string, string>,
  raw: { interaction: string; token?: string; appIconUrl?: string }
): Record<string, string> {
  return {
    ...data,
    pple_interaction: raw.interaction,
    ...(raw.token ? { pple_response_token: raw.token } : {}),
    ...(raw.appIconUrl ? { appIconUrl: raw.appIconUrl } : {}),
  }
}

/** The keys a result replacement keeps, so a tap still opens the detail. */
export function tapToDetailData(data: Record<string, unknown> | null | undefined) {
  const out: Record<string, string> = {}
  if (!data) return out
  for (const key of ['link', 'notificationId', 'appName', 'appIconUrl']) {
    const value = data[key]
    if (typeof value === 'string' && value) out[key] = value
  }
  return out
}

/** Stable presented-notification identifier, so a result or dismiss can address it. */
export const trayNotificationIdentifier = (notificationId: string) =>
  `pple.notification.${notificationId}`

/** The id from a `{ pple_dismiss }` data-only message, or `null` for any other. */
export function parseDismiss(payload: unknown): string | null {
  if (!isRecord(payload)) return null
  return isNonEmptyString(payload.pple_dismiss) ? payload.pple_dismiss : null
}

/**
 * Which presented notifications to remove on logout, and which categories to
 * delete. Interactive cards carry an action token for the signed-in user, so
 * none should outlive the session.
 *
 * Android: identifier `pple.notification.*` with `pple_interaction` in its data.
 * iOS: the category starts with `pple.ix.`. Either marker is enough on either
 * platform, since the identifier of a remote iOS notification is not ours.
 */
export interface PresentedNotificationView {
  identifier: string
  categoryIdentifier?: string | null
  data?: Record<string, unknown> | null
}

export function selectInteractiveToDismiss(
  presented: readonly PresentedNotificationView[],
  platform: string
): string[] {
  return presented
    .filter((n) => {
      if (platform === 'ios') return isTrayCategory(n.categoryIdentifier)
      return (
        n.identifier.startsWith('pple.notification.') &&
        isNonEmptyString(n.data?.['pple_interaction'])
      )
    })
    .map((n) => n.identifier)
}

/** The categories to re-register on logout: everything except `pple.ix.*`. */
export const selectCategoriesToKeep = <T extends { identifier: string }>(
  categories: readonly T[]
): T[] => categories.filter((c) => !isTrayCategory(c.identifier))
