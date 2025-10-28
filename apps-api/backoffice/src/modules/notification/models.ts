import { ListCursorResponse } from '@pple-today/api-common/dtos'
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
    content: t.Object({
      header: t.String(),
      message: t.String(),
      image: t.Nullable(t.String()),
      link: t.Nullable(
        t.Union([
          t.Object({
            type: t.Literal('MINI_APP'),
            value: t.String(),
          }),
          t.Object({
            type: t.Literal('IN_APP_NAVIGATION'),
            value: t.String(),
          }),
          t.Object({
            type: t.Literal('EXTERNAL_BROWSER'),
            value: t.String(),
          }),
        ])
      ),
    }),
    isRead: t.Boolean(),
    createdAt: t.Date(),
  })
)
export type ListHistoryNotificationResponse = Static<typeof ListHistoryNotificationResponse>

export const CreateNewExternalNotificationHeader = t.Object({
  Authorization: t.String({ pattern: '^Bearer .+' }),
})
export type CreateNewExternalNotificationHeader = Static<typeof CreateNewExternalNotificationHeader>
export const CreateNewExternalNotificationBody = t.Object({
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
  content: t.Object({
    header: t.String(),
    message: t.String(),
    image: t.Optional(t.String()),
    link: t.Optional(
      t.Union([
        t.Object({
          type: t.Literal('MINI_APP'),
          value: t.String(),
        }),
        t.Object({
          type: t.Literal('IN_APP_NAVIGATION'),
          value: t.String(),
        }),
        t.Object({
          type: t.Literal('EXTERNAL_BROWSER'),
          value: t.String(),
        }),
      ])
    ),
  }),
})
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
