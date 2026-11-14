import {
  NotificationApiKey,
  NotificationInteractionAction,
  NotificationInteractionField,
  NotificationInteractionSpec,
  NotificationInteractionValues,
  PaginationQuery,
  TemporaryFilePath,
} from '@pple-today/api-common/dtos'
import { NotificationInAppType } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const ListApiKeyNotificationsQuery = t.Composite([
  PaginationQuery,
  t.Object({
    miniAppId: t.Optional(t.String({ description: 'Only return keys bound to this mini app' })),
  }),
])
export type ListApiKeyNotificationsQuery = Static<typeof ListApiKeyNotificationsQuery>

// `source` is on the wire because the portal must not offer to manage a key it
// does not own: a PLATFORM key belongs to the Builder and is managed through the
// provisioner, and it is also the one kind that cannot target recipients.
export const ListApiKeyNotificationsResponse = t.Array(
  t.Pick(NotificationApiKey, [
    'id',
    'name',
    'active',
    'miniAppId',
    'source',
    'createdAt',
    'updatedAt',
  ])
)
export type ListApiKeyNotificationsResponse = Static<typeof ListApiKeyNotificationsResponse>

// No `source`: a key created here is an admin key by definition, and letting the
// caller ask for a PLATFORM one would be asking to hand itself a restriction.
// Binding to a Builder App is allowed and is the point — the key wears the app's
// name and icon while keeping the admin's own audience reach.
export const CreateApiKeyNotificationBody = t.Composite([
  t.Pick(NotificationApiKey, ['name']),
  t.Object({
    miniAppId: t.Optional(
      t.String({ description: 'Bind the new key to this mini app; omit for an unbound key' })
    ),
  }),
])
export type CreateApiKeyNotificationBody = Static<typeof CreateApiKeyNotificationBody>

export const CreateApiKeyNotificationResponse = NotificationApiKey
export type CreateApiKeyNotificationResponse = Static<typeof CreateApiKeyNotificationResponse>

export const UpdateApiKeyNotificationParams = t.Object({
  id: t.String({ description: 'The ID of the API key notification' }),
})
export type UpdateApiKeyNotificationParams = Static<typeof UpdateApiKeyNotificationParams>

export const UpdateApiKeyNotificationBody = t.Partial(
  t.Pick(NotificationApiKey, ['name', 'active'])
)
export type UpdateApiKeyNotificationBody = Static<typeof UpdateApiKeyNotificationBody>

export const UpdateApiKeyNotificationResponse = t.Pick(NotificationApiKey, [
  'id',
  'name',
  'active',
  'createdAt',
  'updatedAt',
])
export type UpdateApiKeyNotificationResponse = Static<typeof UpdateApiKeyNotificationResponse>

export const RotateApiKeyNotificationParams = t.Object({
  id: t.String({ description: 'The ID of the API key notification' }),
})
export type RotateApiKeyNotificationParams = Static<typeof RotateApiKeyNotificationParams>

export const RotateApiKeyNotificationResponse = t.Pick(NotificationApiKey, ['apiKey'])
export type RotateApiKeyNotificationResponse = Static<typeof RotateApiKeyNotificationResponse>

export const DeleteApiKeyNotificationParams = t.Object({
  id: t.String({ description: 'The ID of the API key notification' }),
})
export type DeleteApiKeyNotificationParams = Static<typeof DeleteApiKeyNotificationParams>

export const DeleteApiKeyNotificationResponse = t.Literal('No Content')
export type DeleteApiKeyNotificationResponse = Static<typeof DeleteApiKeyNotificationResponse>

// ---------------------------------------------------------------------------
// Sending from the admin portal (the แจ้งเตือน section)
//
// Always sent as PPLE Today: there is no sender app and no x-notification-app-key,
// so nothing here is app-bound. An interaction's answers are kept in today-v2
// (`NotificationOrigin.ADMIN_PORTAL`) and read back through the routes below
// instead of being POSTed to an app.
// ---------------------------------------------------------------------------

/** Most numbers one portal send may name. Matches the app-install count cap. */
export const ADMIN_NOTIFICATION_MAX_PHONE_NUMBERS = 10000

export const AdminNotificationAudience = t.Union([
  t.Object({ type: t.Literal('BROADCAST') }, { description: 'Every PPLE Today account.' }),
  t.Object(
    {
      type: t.Literal('ROLE'),
      roles: t.Array(t.String(), { minItems: 1 }),
    },
    { description: 'Accounts holding any of these roles.' }
  ),
  t.Object(
    {
      type: t.Literal('ADDRESS'),
      provinces: t.Array(t.String()),
      districts: t.Array(t.String()),
    },
    {
      description:
        'Accounts in any of these provinces, or any of these districts. At least one of the two lists must be non-empty.',
    }
  ),
  t.Object(
    {
      type: t.Literal('PHONE_NUMBER'),
      phoneNumbers: t.Array(t.String(), {
        minItems: 1,
        maxItems: ADMIN_NOTIFICATION_MAX_PHONE_NUMBERS,
        description:
          'Thai mobile numbers, 0XXXXXXXXX or +66XXXXXXXXX. A malformed entry refuses the whole send.',
      }),
    },
    { description: 'One or more people by phone number.' }
  ),
])
export type AdminNotificationAudience = Static<typeof AdminNotificationAudience>

const AdminLinkBypass = t.Optional(
  t.Boolean({
    description:
      'Open the link straight from the push instead of the notification detail. Not allowed with an external link or with an interaction.',
  })
)

export const AdminNotificationLink = t.Union([
  t.Object({
    type: t.Literal('IN_APP_NAVIGATION'),
    inAppType: t.Enum(NotificationInAppType),
    inAppId: t.Optional(
      t.String({ description: 'Required for entity types (post, poll, …); ignored for screens.' })
    ),
    bypassNotificationCenter: AdminLinkBypass,
  }),
  t.Object({
    type: t.Literal('MINI_APP'),
    miniAppId: t.String(),
    path: t.Optional(
      t.String({ description: 'Path inside the mini app, starting with `/`. Defaults to `/`.' })
    ),
    bypassNotificationCenter: AdminLinkBypass,
  }),
  t.Object({
    type: t.Literal('EXTERNAL_BROWSER'),
    url: t.String({ format: 'uri' }),
  }),
])
export type AdminNotificationLink = Static<typeof AdminNotificationLink>

export const AdminSendNotificationBody = t.Object({
  audience: AdminNotificationAudience,
  content: t.Object({
    header: t.String({ minLength: 1, maxLength: 200 }),
    message: t.String({ minLength: 1, maxLength: 2000 }),
    imageFilePath: t.Optional(TemporaryFilePath),
    actionButtonText: t.Optional(
      t.String({ maxLength: 40, description: 'Label of the link button; only used with a link.' })
    ),
  }),
  link: t.Optional(AdminNotificationLink),
  smsFallbackText: t.Optional(
    t.String({
      minLength: 1,
      maxLength: 500,
      description:
        'PHONE_NUMBER audience only. Texted to numbers with no account and accounts with no push token.',
    })
  ),
  interaction: t.Optional(t.Omit(NotificationInteractionSpec, ['ref'])),
})
export type AdminSendNotificationBody = Static<typeof AdminSendNotificationBody>

export const AdminSendNotificationResponse = t.Object({
  notificationId: t.String(),
  recipientCount: t.Integer({ description: 'Accounts the notification was created for' }),
  phoneNumber: t.Optional(
    t.Object({
      success: t.Array(t.String(), { description: 'Numbers that matched an account' }),
      failed: t.Array(t.String(), { description: 'Numbers that matched no account' }),
    })
  ),
})
export type AdminSendNotificationResponse = Static<typeof AdminSendNotificationResponse>

/** The same notification minus its audience: a test send goes to the sender only, and never by SMS. */
export const AdminSendTestNotificationBody = t.Omit(AdminSendNotificationBody, [
  'audience',
  'smsFallbackText',
])
export type AdminSendTestNotificationBody = Static<typeof AdminSendTestNotificationBody>

export const AdminSendTestNotificationResponse = t.Object({
  notificationId: t.String(),
  hasPushToken: t.Boolean({
    description:
      "Whether the admin's own account has a device to push to. False means it reached only their notification centre: they have not signed in to the PPLE Today app, or notifications are off.",
  }),
})
export type AdminSendTestNotificationResponse = Static<typeof AdminSendTestNotificationResponse>

export const AdminCountNotificationAudienceBody = t.Object({ audience: AdminNotificationAudience })
export type AdminCountNotificationAudienceBody = Static<typeof AdminCountNotificationAudienceBody>

export const AdminCountNotificationAudienceResponse = t.Object({
  userCount: t.Integer({ description: 'Accounts the audience matches' }),
  pushReachableCount: t.Integer({
    description: 'Of those, accounts with at least one push token',
  }),
  invalidPhoneNumbers: t.Array(t.String(), {
    description: 'PHONE_NUMBER only: entries that are not a Thai mobile number',
  }),
})
export type AdminCountNotificationAudienceResponse = Static<
  typeof AdminCountNotificationAudienceResponse
>

export const AdminNotificationRolesResponse = t.Array(
  t.Object({ role: t.String(), userCount: t.Integer() })
)
export type AdminNotificationRolesResponse = Static<typeof AdminNotificationRolesResponse>

const AdminSentNotificationSender = t.Nullable(t.Object({ id: t.String(), name: t.String() }))

/** The audience as stored on the notification, for display. */
export const AdminSentNotificationAudience = t.Union([
  t.Object({ type: t.Literal('BROADCAST') }),
  t.Object({ type: t.Literal('ROLE'), roles: t.Array(t.String()) }),
  t.Object({
    type: t.Literal('ADDRESS'),
    provinces: t.Array(t.String()),
    districts: t.Array(t.String()),
  }),
  t.Object({ type: t.Literal('PHONE_NUMBER'), phoneNumberCount: t.Integer() }),
  t.Object({ type: t.Literal('TEST') }, { description: 'A test send to the sender only.' }),
])
export type AdminSentNotificationAudience = Static<typeof AdminSentNotificationAudience>

export const AdminListSentNotificationsQuery = PaginationQuery
export type AdminListSentNotificationsQuery = Static<typeof AdminListSentNotificationsQuery>

export const AdminSentNotificationSummary = t.Object({
  id: t.String(),
  title: t.String(),
  message: t.String(),
  audience: AdminSentNotificationAudience,
  hasInteraction: t.Boolean(),
  /** Null when there is no interaction. Never RESPONDED: that is per recipient. */
  interactionState: t.Nullable(
    t.Union([t.Literal('OPEN'), t.Literal('CLOSED'), t.Literal('EXPIRED')])
  ),
  recipientCount: t.Integer(),
  responseCount: t.Integer(),
  sentBy: AdminSentNotificationSender,
  createdAt: t.Date(),
})
export type AdminSentNotificationSummary = Static<typeof AdminSentNotificationSummary>

export const AdminListSentNotificationsResponse = t.Object({
  data: t.Array(AdminSentNotificationSummary),
  meta: t.Object({ count: t.Integer() }),
})
export type AdminListSentNotificationsResponse = Static<typeof AdminListSentNotificationsResponse>

export const AdminSentNotificationParams = t.Object({ id: t.String() })
export type AdminSentNotificationParams = Static<typeof AdminSentNotificationParams>

export const AdminSentNotificationDetail = t.Composite([
  AdminSentNotificationSummary,
  t.Object({
    image: t.Nullable(t.String()),
    actionButtonText: t.Nullable(t.String()),
    link: t.Nullable(
      t.Union([
        t.Object({
          type: t.Literal('IN_APP_NAVIGATION'),
          inAppType: t.Enum(NotificationInAppType),
          inAppId: t.String(),
          bypassNotificationCenter: t.Boolean(),
        }),
        t.Object({
          type: t.Literal('MINI_APP'),
          destination: t.String(),
          bypassNotificationCenter: t.Boolean(),
        }),
        t.Object({ type: t.Literal('EXTERNAL_BROWSER'), destination: t.String() }),
      ])
    ),
    interaction: t.Nullable(
      t.Object({
        fields: t.Array(NotificationInteractionField),
        actions: t.Array(NotificationInteractionAction),
        tray: t.Boolean(),
        liveActivity: t.Boolean(),
        expiresAt: t.Nullable(t.Date()),
        closedAt: t.Nullable(t.Date()),
        /** Answers per action, for every action (zero included), in action order. */
        actionCounts: t.Array(t.Object({ actionId: t.String(), count: t.Integer() })),
      })
    ),
    readCount: t.Integer(),
  }),
])
export type AdminSentNotificationDetail = Static<typeof AdminSentNotificationDetail>

/** Up to 1000 so the portal can export every answer in a few pages. */
export const AdminListNotificationResponsesQuery = t.Object({
  page: t.Optional(t.Number({ minimum: 1, default: 1 })),
  limit: t.Optional(t.Number({ minimum: 1, maximum: 1000, default: 20 })),
})
export type AdminListNotificationResponsesQuery = Static<typeof AdminListNotificationResponsesQuery>

export const AdminListNotificationResponsesResponse = t.Object({
  data: t.Array(
    t.Object({
      id: t.String(),
      user: t.Object({ id: t.String(), name: t.String(), phoneNumber: t.String() }),
      actionId: t.String(),
      values: t.Nullable(NotificationInteractionValues),
      channel: t.Union([t.Literal('APP'), t.Literal('TRAY')]),
      respondedAt: t.Date(),
    })
  ),
  meta: t.Object({ count: t.Integer() }),
})
export type AdminListNotificationResponsesResponse = Static<
  typeof AdminListNotificationResponsesResponse
>

export const AdminCloseNotificationInteractionResponse = t.Object({ closedAt: t.Date() })
export type AdminCloseNotificationInteractionResponse = Static<
  typeof AdminCloseNotificationInteractionResponse
>
