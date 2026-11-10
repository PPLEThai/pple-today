import { NotificationApiKeySource, NotificationInAppType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

const NotificationLinkBase = t.Object({
  bypassNotificationCenter: t.Optional(t.Boolean()),
})

/**
 * The app a notification came from, as the client renders it: an icon in place
 * of the platform bell and a name in place of "แจ้งเตือนทั่วไป".
 *
 * Absent means PPLE Today itself — every notification sent before app binding,
 * and every send from a legacy unbound key — so a client that ignores this
 * field keeps today's appearance.
 */
export const NotificationSenderApp = t.Object({
  name: t.String(),
  iconUrl: t.Optional(t.String()),
  /**
   * The app's mini-app slug, which the client turns into a route so a
   * notification carrying no link of its own can still offer a way into the app
   * that sent it.
   */
  slug: t.String(),
})
export type NotificationSenderApp = Static<typeof NotificationSenderApp>

// ---------------------------------------------------------------------------
// Interactive notifications (docs/interactive-notifications.md)
// ---------------------------------------------------------------------------

/**
 * The icons a sender may name on an action. Mirrored in the mobile icon map
 * (lucide) and the iOS extension's SF Symbol map: adding one means updating all
 * three. An older client shows an unknown icon as no icon.
 */
export const NOTIFICATION_INTERACTION_ICONS = [
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

export const NotificationInteractionIcon = t.Union(
  NOTIFICATION_INTERACTION_ICONS.map((icon) => t.Literal(icon)),
  { description: 'One name from the interaction icon allowlist' }
)
export type NotificationInteractionIcon = (typeof NOTIFICATION_INTERACTION_ICONS)[number]

export const NOTIFICATION_INTERACTION_ACTION_STYLES = ['primary', 'outline', 'destructive'] as const
export const NotificationInteractionActionStyle = t.Union([
  t.Literal('primary'),
  t.Literal('outline'),
  t.Literal('destructive'),
])
export type NotificationInteractionActionStyle = Static<typeof NotificationInteractionActionStyle>

const NotificationInteractionOption = t.Object({ id: t.String(), label: t.String() })
export type NotificationInteractionOption = Static<typeof NotificationInteractionOption>

const NotificationInteractionConfirm = t.Object({
  title: t.String(),
  message: t.Optional(t.String()),
})
export type NotificationInteractionConfirm = Static<typeof NotificationInteractionConfirm>

// --- Sender side: the shape as sent. Structural only; every rule that produces
// a path-naming NOTIFICATION_INVALID_INTERACTION lives in the pure validator
// (validateInteractionSpec), so these carry no length or count constraints.

const NotificationInteractionFieldBase = {
  id: t.String(),
  label: t.String(),
  description: t.Optional(t.String()),
  required: t.Optional(t.Boolean()),
}

export const NotificationInteractionSpecField = t.Union([
  t.Object({
    ...NotificationInteractionFieldBase,
    type: t.Literal('text'),
    placeholder: t.Optional(t.String()),
    multiline: t.Optional(t.Boolean()),
    maxLength: t.Optional(t.Number()),
    minLength: t.Optional(t.Number()),
  }),
  t.Object({
    ...NotificationInteractionFieldBase,
    type: t.Literal('radio'),
    options: t.Array(NotificationInteractionOption),
    default: t.Optional(t.String()),
  }),
  t.Object({
    ...NotificationInteractionFieldBase,
    type: t.Literal('checkbox'),
    options: t.Array(NotificationInteractionOption),
    min: t.Optional(t.Number()),
    max: t.Optional(t.Number()),
    default: t.Optional(t.Array(t.String())),
  }),
])
export type NotificationInteractionSpecField = Static<typeof NotificationInteractionSpecField>

export const NotificationInteractionSpecAction = t.Object({
  id: t.String(),
  label: t.String(),
  icon: t.Optional(t.String()),
  style: t.Optional(NotificationInteractionActionStyle),
  requires: t.Optional(t.Array(t.String())),
  confirm: t.Optional(NotificationInteractionConfirm),
})
export type NotificationInteractionSpecAction = Static<typeof NotificationInteractionSpecAction>

export const NotificationInteractionSpec = t.Object(
  {
    ref: t.Optional(t.String()),
    expiresAt: t.Optional(t.String()),
    fields: t.Optional(t.Array(NotificationInteractionSpecField)),
    actions: t.Array(NotificationInteractionSpecAction),
    tray: t.Optional(t.Boolean()),
  },
  {
    description:
      'An interaction to attach to an app-bound notification: the app asks the recipient something and the answer is POSTed back to the app.',
  }
)
export type NotificationInteractionSpec = Static<typeof NotificationInteractionSpec>

// --- Client side: the resolved shape (defaults filled), minus `ref`.

export const NotificationInteractionFieldBaseResolved = {
  ...NotificationInteractionFieldBase,
  required: t.Boolean(),
}

export const NotificationInteractionField = t.Union([
  t.Object({
    ...NotificationInteractionFieldBaseResolved,
    type: t.Literal('text'),
    placeholder: t.Optional(t.String()),
    multiline: t.Boolean(),
    maxLength: t.Number(),
    minLength: t.Optional(t.Number()),
  }),
  t.Object({
    ...NotificationInteractionFieldBaseResolved,
    type: t.Literal('radio'),
    options: t.Array(NotificationInteractionOption),
    default: t.Optional(t.String()),
  }),
  t.Object({
    ...NotificationInteractionFieldBaseResolved,
    type: t.Literal('checkbox'),
    options: t.Array(NotificationInteractionOption),
    min: t.Optional(t.Number()),
    max: t.Optional(t.Number()),
    default: t.Optional(t.Array(t.String())),
  }),
])
export type NotificationInteractionField = Static<typeof NotificationInteractionField>

export const NotificationInteractionAction = t.Object({
  id: t.String(),
  label: t.String(),
  icon: t.Optional(NotificationInteractionIcon),
  style: NotificationInteractionActionStyle,
  requires: t.Optional(t.Array(t.String())),
  confirm: t.Optional(NotificationInteractionConfirm),
})
export type NotificationInteractionAction = Static<typeof NotificationInteractionAction>

export const NOTIFICATION_INTERACTION_STATES = ['OPEN', 'RESPONDED', 'EXPIRED', 'CLOSED'] as const
export const NotificationInteractionState = t.Union([
  t.Literal('OPEN'),
  t.Literal('RESPONDED'),
  t.Literal('EXPIRED'),
  t.Literal('CLOSED'),
])
export type NotificationInteractionState = Static<typeof NotificationInteractionState>

/** `{ [fieldId]: string | string[] }`: text and radio give a string, checkbox an array. */
export const NotificationInteractionValues = t.Record(
  t.String(),
  t.Union([t.String(), t.Array(t.String())])
)
export type NotificationInteractionValues = Static<typeof NotificationInteractionValues>

export const NotificationInteraction = t.Object({
  v: t.Literal(1),
  fields: t.Array(NotificationInteractionField),
  actions: t.Array(NotificationInteractionAction),
  state: NotificationInteractionState,
  expiresAt: t.Optional(t.Date()),
  response: t.Optional(
    t.Object({
      actionId: t.String(),
      values: t.Optional(NotificationInteractionValues),
      respondedAt: t.Date(),
    })
  ),
})
export type NotificationInteraction = Static<typeof NotificationInteraction>

export const NotificationResponseBody = t.Object({
  actionId: t.String(),
  values: t.Optional(t.Record(t.String(), t.Unknown())),
})
export type NotificationResponseBody = Static<typeof NotificationResponseBody>

/**
 * What the tray shows for an interactive notification, computed by the server and
 * carried in the push as `pple_interaction` (JSON string). Clients never re-derive
 * it from the full spec, which never travels in the push.
 *
 * `bg: false` marks an action that opens the app instead of submitting in the
 * background (it has `confirm` or `requires`).
 */
export type TrayInteractionButtons = {
  id: string
  kind: 'buttons'
  actions: {
    id: string
    label: string
    icon?: NotificationInteractionIcon
    destructive?: boolean
    bg: boolean
  }[]
}
export type TrayInteractionReply = {
  id: string
  kind: 'reply'
  fieldId: string
  placeholder?: string
  submitLabel: string
  actionId: string
  bg: true
}
export type TrayInteraction = TrayInteractionButtons | TrayInteractionReply

export const Notification = t.Object({
  id: t.String(),
  app: t.Optional(NotificationSenderApp),
  content: t.Object({
    header: t.String(),
    message: t.String(),
    image: t.Optional(t.String()),
    actionButtonText: t.Optional(t.String()),
    link: t.Optional(
      t.Union([
        t.Composite([
          NotificationLinkBase,
          t.Object({
            type: t.Literal('MINI_APP'),
            destination: t.String(),
          }),
        ]),
        t.Composite([
          NotificationLinkBase,
          t.Object({
            type: t.Literal('IN_APP_NAVIGATION'),
            destination: t.Object({
              inAppType: t.Enum(NotificationInAppType),
              inAppId: t.String(),
            }),
          }),
        ]),
        t.Composite([
          NotificationLinkBase,
          t.Object({
            type: t.Literal('EXTERNAL_BROWSER'),
            destination: t.String(),
          }),
        ]),
      ])
    ),
  }),
  /** Present only on an interactive notification (GET /notifications/:id). */
  interaction: t.Optional(NotificationInteraction),
  isRead: t.Boolean(),
  createdAt: t.Date(),
})
export type Notification = Static<typeof Notification>

export const NotificationApiKey = t.Object({
  id: t.String({ description: 'The ID of the notification API key' }),
  name: t.String({ description: 'The name of the notification API key' }),
  apiKey: t.String({ description: 'The notification API key' }),
  active: t.Boolean({ description: 'Whether the notification API key is active' }),
  miniAppId: t.Nullable(
    t.String({
      description:
        "The mini app this key is bound to. Null for a legacy unbound key with today's raw phone-number behaviour.",
    })
  ),
  source: t.Enum(NotificationApiKeySource, {
    description:
      "Who issued the key, which is what decides its capability. ADMIN keys were created in the admin portal and may target recipients directly whichever app they are bound to. PLATFORM keys were provisioned for a Builder App: confined to that app's own users, and metered against a daily quota.",
  }),
  createdAt: t.Date({
    description: 'The date and time when the notification API key was created',
  }),
  updatedAt: t.Date({
    description: 'The date and time when the notification API key was last updated',
  }),
})
export type NotificationApiKey = Static<typeof NotificationApiKey>
