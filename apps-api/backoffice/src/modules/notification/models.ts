import { ListCursorResponse, Notification } from '@pple-today/api-common/dtos'
import { Static, t } from 'elysia'

export const RegisterNotificationBody = t.Object({
  deviceToken: t.String(),
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

export const CreateAppNotificationResponse = t.Object({
  recipientCount: t.Integer({
    description:
      'How many App Users the notification was addressed to, after the tier audience was applied. Zero is a valid outcome — nobody has opened the app yet, or the tier admits nobody.',
  }),
  dailyQuota: t.Integer({ description: 'Sends allowed per day for this key' }),
  remaining: t.Integer({ description: 'Sends still available after this one' }),
  resetAt: t.String({
    format: 'date-time',
    description: 'When the quota window rolls over (Asia/Bangkok midnight)',
  }),
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
