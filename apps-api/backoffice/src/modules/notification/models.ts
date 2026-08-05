import {
  ListCursorResponse,
  Notification,
  NotificationSenderApp,
} from '@pple-today/api-common/dtos'
import { NotificationTokenPlatform } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

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
 * The body of an audience-bound send: content, plus an optional path-only
 * self-link.
 *
 * There is deliberately no `audience` field. The key identifies the app, the
 * platform resolves the app's App Users within its current tier, and an app has
 * no way to name a recipient — which is the entire privacy guarantee. The
 * `smsFallbackText` escape hatch is absent for the same reason: SMS fallback is
 * addressed by phone number.
 *
 * Free-form `content.link` is withheld: the shared schema can address `MINI_APP`
 * and `IN_APP_NAVIGATION` destinations anywhere in PPLE Today, so accepting it
 * here would let a Builder App deep-link people into another team's mini app.
 * Optional `linkPath` is the self-link alternative — a path under *this* app,
 * validated and joined to the app's redirect entry server-side before it becomes
 * a normal notification destination.
 */
export const CreateAppNotificationBody = t.Object({
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
})
export type CreateAppNotificationBody = Static<typeof CreateAppNotificationBody>

/**
 * The quota fields are optional because not every bound key is metered. The
 * daily quota is a Builder App Resource Limit; a key bound to a central-team
 * app is exempt, and reporting a budget it is not held to would be a number
 * nothing enforces.
 */
export const CreateAppNotificationResponse = t.Object({
  recipientCount: t.Integer({
    description:
      'How many App Users the notification was addressed to, after the tier audience was applied. Zero is a valid outcome — nobody has opened the app yet, or the tier admits nobody.',
  }),
  dailyQuota: t.Optional(
    t.Integer({ description: 'Sends allowed per day for this key; absent when unmetered' })
  ),
  remaining: t.Optional(
    t.Integer({ description: 'Sends still available after this one; absent when unmetered' })
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
