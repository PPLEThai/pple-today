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

export const CreateNewExternalNotificationHeader = t.Object({
  authorization: t.String({ pattern: '^Bearer .+' }),
})
export type CreateNewExternalNotificationHeader = Static<typeof CreateNewExternalNotificationHeader>
export const CreateNewExternalNotificationBody = t.Intersect([
  t.Object({
    audience: t.Union([
      t.Object({
        type: t.Literal('ROLE'),
        details: t.Array(t.String()),
      }),
      t.Object({
        type: t.Literal('PHONE_NUMBER'),
        details: t.Array(t.String()),
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
  }),
  t.Pick(Notification, ['content']),
])
export type CreateNewExternalNotificationBody = Static<typeof CreateNewExternalNotificationBody>

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
