import {
  ListCursorResponse,
  Notification,
  NotificationSenderApp,
} from '@pple-today/api-common/dtos'
import { NotificationTokenPlatform } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { MAX_DIRECT_RECIPIENTS } from './direct-recipients'

/**
 * Both new fields are optional so an older client keeps registering exactly as
 * it does today. Omitting them is not "leave as-is": registration asserts what
 * *this install* can do right now, so an omission records an unknown platform
 * and no branding support — which is also what a downgrade should record.
 */
export const RegisterNotificationBody = t.Object({
  deviceToken: t.String(),
  platform: t.Optional(
    t.Enum(NotificationTokenPlatform, {
      description:
        'The device platform. The server builds a different push payload per platform; omitted by clients built before app-bound notifications.',
    })
  ),
  supportsAppBranding: t.Optional(
    t.Boolean({
      description:
        'Whether this build can render an app-branded notification from a data-only message. Only tokens that assert this receive the data-only Android payload.',
    })
  ),
})
export type RegisterNotificationBody = Static<typeof RegisterNotificationBody>

export const RegisterNotificationResponse = t.Object({
  message: t.String(),
})
export type RegisterNotificationResponse = Static<typeof RegisterNotificationResponse>

export const ReadNotificationParams = t.Object({
  id: t.String(),
})
export type ReadNotificationParams = Static<typeof ReadNotificationParams>

export const ReadNotificationResponse = t.Object({
  message: t.String(),
})
export type ReadNotificationResponse = Static<typeof ReadNotificationResponse>

export const ReadAllNotificationResponse = t.Object({
  message: t.String(),
})
export type ReadAllNotificationResponse = Static<typeof ReadAllNotificationResponse>

export const ListHistoryNotificationQuery = t.Object({
  cursor: t.Optional(t.String()),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 20 })),
})
export type ListHistoryNotificationQuery = Static<typeof ListHistoryNotificationQuery>

export const ListHistoryNotificationResponse = ListCursorResponse(
  t.Object({
    id: t.String(),
    title: t.String(),
    description: t.Optional(t.String()),
    image: t.Optional(t.String()),
    /** The sending app, or absent for PPLE Today's own notifications. */
    app: t.Optional(NotificationSenderApp),
    isRead: t.Boolean(),
    createdAt: t.Date(),
  })
)
export type ListHistoryNotificationResponse = Static<typeof ListHistoryNotificationResponse>

export const GetNotificationDetailsByIdParams = t.Object({
  id: t.String(),
})
export type GetNotificationDetailsByIdParams = Static<typeof GetNotificationDetailsByIdParams>

export const GetNotificationDetailsByIdResponse = Notification
export type GetNotificationDetailsByIdResponse = Static<typeof GetNotificationDetailsByIdResponse>

export const GetUnreadNotificationCountResponse = t.Object({
  unreadCount: t.Number(),
})
export type GetUnreadNotificationCountResponse = Static<typeof GetUnreadNotificationCountResponse>

export const CreateNewExternalNotificationHeader = t.Object({
  authorization: t.String({ pattern: '^Bearer .+' }),
})
export type CreateNewExternalNotificationHeader = Static<typeof CreateNewExternalNotificationHeader>
export const CreateNewExternalNotificationBody = t.Composite([
  t.Object({
    audience: t.Union([
      t.Object({
        type: t.Literal('ROLE'),
        details: t.Array(t.String()),
      }),
      t.Object({
        type: t.Literal('PHONE_NUMBER'),
        details: t.Array(
          t.String({
            description:
              'Thai mobile number in +66XXXXXXXXX or 0XXXXXXXXX format (leading zero is converted to +66).',
          })
        ),
      }),
      t.Object({
        type: t.Literal('ADDRESS'),
        details: t.Object({
          provinces: t.Array(t.String()),
          districts: t.Array(t.String()),
        }),
      }),
      t.Object({
        type: t.Literal('BROADCAST'),
      }),
    ]),
    smsFallbackText: t.Optional(
      t.String({
        description:
          'If provided, sends an SMS with this text to users who are not in the Today app (i.e. have no registered push notification token).',
      })
    ),
  }),
  t.Pick(Notification, ['content']),
])
export type CreateNewExternalNotificationBody = Static<typeof CreateNewExternalNotificationBody>

/**
 * One recipient a Builder App may *name*, by `sub` or `phone` — exactly one of
 * the two. Both, neither, or a blank identifier is a 400: picking a winner would
 * be a rule nobody remembers, and answering an entry that names two different
 * people would let a caller probe whether they are the same person.
 *
 * The schema leaves both properties optional because the exactly-one-of rule,
 * the per-call cap and the non-empty rule are enforced together in
 * `canonicalizeRecipients`, which answers 400 for all of them rather than
 * splitting one contract across two status codes.
 */
export const DirectRecipient = t.Object(
  {
    sub: t.Optional(t.String({ description: 'PPLE ID subject of the recipient' })),
    phone: t.Optional(
      t.String({
        description:
          'Thai mobile number, `0XXXXXXXXX` or `+66XXXXXXXXX`. Canonicalised to E.164 (default region TH), so both spellings resolve to the same person.',
      })
    ),
  },
  { description: 'Exactly one of `sub` or `phone`. Neither or both is a 400.' }
)
export type DirectRecipient = Static<typeof DirectRecipient>

/**
 * Who a send is for. **Required** — and required is the whole point.
 *
 * A dropped field must not be able to turn a message meant for one person into
 * a message to everyone, so there is no default: a body without an `audience` is
 * refused, never treated as a broadcast and never as a no-op.
 *
 * Naming recipients **narrows** a send; it can never widen one. A `direct` list
 * is filtered by the same `App Users ∩ current tier audience` intersection that
 * resolves a broadcast, so an app still reaches only the people who use it and
 * still has no way to learn or reach anybody else.
 */
export const AppNotificationAudience = t.Union(
  [
    t.Object(
      { kind: t.Literal('all') },
      { description: "Every App User inside the app's current publication tier." }
    ),
    t.Object(
      {
        kind: t.Literal('direct'),
        recipients: t.Array(DirectRecipient, {
          description: `The people to notify, 1–${MAX_DIRECT_RECIPIENTS} per call. An empty list or one over the cap is a 400 — never a silent truncation, and never a fallback to the whole audience.`,
        }),
      },
      { description: 'A named subset of that same audience. Naming narrows; it never widens.' }
    ),
  ],
  { description: 'Required. A body with no audience is a 400, never a broadcast.' }
)
export type AppNotificationAudience = Static<typeof AppNotificationAudience>

/**
 * The body of an audience-bound send: who it is for, the content, and an
 * optional path-only self-link.
 *
 * The key identifies the app and the platform resolves the audience from the
 * app's own App User registry; `audience` chooses between all of them and a
 * named subset of them. The `smsFallbackText` escape hatch stays absent — SMS
 * reaches people by phone number whether or not they use the app, which is
 * exactly the reach a Builder App must not have.
 *
 * Free-form `content.link` is withheld: the shared schema can address `MINI_APP`
 * and `IN_APP_NAVIGATION` destinations anywhere in PPLE Today, so accepting it
 * here would let a Builder App deep-link people into another team's mini app.
 * Optional `linkPath` is the self-link alternative — a path under *this* app,
 * validated and joined to the app's redirect entry server-side before it becomes
 * a normal notification destination.
 *
 * Content is uniform across recipients: this is one notification addressed to
 * several people, not several notifications in one call.
 */
export const CreateAppNotificationBody = t.Object({
  audience: AppNotificationAudience,
  content: t.Object({
    header: t.String({ description: 'Notification title' }),
    message: t.String({ description: 'Notification body' }),
    image: t.Optional(t.String({ description: 'Optional image URL' })),
  }),
  linkPath: t.Optional(
    t.String({
      description:
        'Path-only deep link into this app (must start with `/`). Resolved server-side against the key’s bound mini app; absolute URLs and cross-app targets are rejected.',
    })
  ),
  idempotencyKey: t.Optional(
    t.String({
      description:
        'Retry token, unique per notification key. Repeating a call that already landed returns its original outcome instead of delivering and charging it again, which is what makes a retry after a timeout safe. Reusing one with a different number of recipients is a 409.',
    })
  ),
})
export type CreateAppNotificationBody = Static<typeof CreateAppNotificationBody>

/**
 * What became of one named recipient.
 *
 * `not_reachable` is a **single collapsed status**, deliberately. It covers *no
 * PPLE ID account*, *an account that has never opened this app*, *someone
 * outside the app's current tier audience*, and *opted out* — and it must not
 * distinguish between them, in this body, in an error code, or through timing.
 * Splitting it into more specific reasons would turn naming a phone number into
 * a directory lookup: an app that cannot *reach* anyone new could still *learn*
 * who exists. The collapse is the feature.
 */
export const DirectRecipientResult = t.Object({
  /** The entry exactly as it was named, so the caller can match it up. */
  recipient: DirectRecipient,
  status: t.Union([t.Literal('delivered'), t.Literal('not_reachable')]),
})
export type DirectRecipientResult = Static<typeof DirectRecipientResult>

/**
 * The quota fields are optional because not every bound key is metered. The
 * daily quota is a Builder App Resource Limit; a key bound to a central-team
 * app is exempt, and reporting a budget it is not held to would be a number
 * nothing enforces.
 */
export const CreateAppNotificationResponse = t.Object({
  recipientCount: t.Optional(
    t.Integer({
      description:
        'How many App Users the notification was delivered to — present for `kind: "all"` only. Zero is a valid outcome: nobody has opened the app yet, or the tier admits nobody. Absent for `kind: "direct"`, where the per-recipient results are the answer and a count of *distinct* people reached would disclose whether two entries named the same person.',
    })
  ),
  results: t.Optional(
    t.Array(DirectRecipientResult, {
      description:
        'One result per named recipient, in the order named — present for `kind: "direct"` only. Two entries naming the same person are both answered `delivered`, and that person is notified once and charged once.',
    })
  ),
  dailyQuota: t.Optional(
    t.Integer({
      description:
        'Deliveries allowed per day for this key; absent when unmetered. A send debits the reach it *requests*, not the reach it achieves: one unit per named recipient (delivered or not), or the audience size for a broadcast.',
    })
  ),
  remaining: t.Optional(
    t.Integer({ description: 'Deliveries still available after this send; absent when unmetered' })
  ),
  resetAt: t.Optional(
    t.String({
      format: 'date-time',
      description:
        'When the quota window rolls over (Asia/Bangkok midnight); absent when unmetered',
    })
  ),
})
export type CreateAppNotificationResponse = Static<typeof CreateAppNotificationResponse>

export const CreateNewExternalNotificationResponse = t.Object({
  success: t.Boolean(),
  phoneNumber: t.Optional(
    t.Object({
      success: t.Array(t.String()),
      failed: t.Array(t.String()),
    })
  ),
})
export type CreateNewExternalNotificationResponse = Static<
  typeof CreateNewExternalNotificationResponse
>

export const GetAppInstallStatusQuery = t.Object({
  phoneNumber: t.String({
    description:
      'The complete mobile number, as 0XXXXXXXXX or +66XXXXXXXXX. Matched exactly — a partial number is never searched on.',
  }),
})
export type GetAppInstallStatusQuery = Static<typeof GetAppInstallStatusQuery>

export const GetAppInstallStatusResponse = t.Object({
  isAppInstalled: t.Boolean({
    description:
      'True when a PPLE Today account holds this number — the person has used PPLE Today at least once. False for someone who registered a PPLE ID on the web and never opened PPLE Today, and for a number no account holds at all.',
  }),
  hasPushToken: t.Boolean({
    description:
      'True when that account has at least one live push token, meaning the native app is installed and can actually be reached. False when notification permission was refused, when the app was uninstalled (tokens FCM rejects are dropped on the next send), and whenever isAppInstalled is false. This is the flag that answers "will this person see a notification?".',
  }),
})
export type GetAppInstallStatusResponse = Static<typeof GetAppInstallStatusResponse>
