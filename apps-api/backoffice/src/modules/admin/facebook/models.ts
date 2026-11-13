import { DetailedFacebookPage, FacebookPage } from '@pple-today/api-common/dtos'
import {
  FacebookConnectAttemptOutcome,
  FacebookPageLinkedStatus,
} from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const FacebookPageIdParams = t.Object({
  facebookPageId: t.String({ description: 'The ID of the facebook page' }),
})
export type FacebookPageIdParams = Static<typeof FacebookPageIdParams>

export const GetFacebookPagesQuery = t.Object({
  limit: t.Number(),
  page: t.Number(),
  search: t.Optional(t.String()),
  status: t.Optional(t.Array(t.Enum(FacebookPageLinkedStatus))),
})
export type GetFacebookPagesQuery = Static<typeof GetFacebookPagesQuery>

export const GetFacebookPagesResponse = t.Object({
  items: t.Array(FacebookPage),
  meta: t.Object({ count: t.Number() }),
})
export type GetFacebookPagesResponse = Static<typeof GetFacebookPagesResponse>

export const GetFacebookPageByIdParams = FacebookPageIdParams
export type GetFacebookPageByIdParams = Static<typeof FacebookPageIdParams>

export const GetFacebookPageByIdResponse = DetailedFacebookPage
export type GetFacebookPageByIdResponse = Static<typeof GetFacebookPageByIdResponse>

export const UpdateFacebookPageParams = FacebookPageIdParams
export type UpdateFacebookPageParams = Static<typeof UpdateFacebookPageParams>

export const UpdateFacebookPageBody = t.Partial(
  t.Object({
    name: t.String({ description: 'The name of the facebook page' }),
    status: t.Enum(FacebookPageLinkedStatus),
  })
)
export type UpdateFacebookPageBody = Static<typeof UpdateFacebookPageBody>

export const UpdateFacebookPageResponse = t.Object({
  message: t.String({ description: 'Success message' }),
})
export type UpdateFacebookPageResponse = Static<typeof UpdateFacebookPageResponse>

export const GetFacebookConnectAttemptsQuery = t.Object({
  limit: t.Number(),
  page: t.Number(),
  search: t.Optional(
    t.String({ description: 'Reference code, or part of the user name or phone number' })
  ),
  userId: t.Optional(t.String()),
  outcome: t.Optional(t.Array(t.Enum(FacebookConnectAttemptOutcome))),
})
export type GetFacebookConnectAttemptsQuery = Static<typeof GetFacebookConnectAttemptsQuery>

export const FacebookConnectAttemptSummary = t.Object({
  id: t.String(),
  referenceCode: t.String(),
  createdAt: t.Date(),
  startedAt: t.Date(),
  outcome: t.Enum(FacebookConnectAttemptOutcome),
  failedStep: t.Nullable(t.String()),
  platform: t.String(),
  osVersion: t.Nullable(t.String()),
  appVersion: t.Nullable(t.String()),
  buildNumber: t.Nullable(t.String()),
  errorDomain: t.Nullable(t.String()),
  errorCode: t.Nullable(t.String()),
  errorMessage: t.Nullable(t.String()),
  user: t.Object({ id: t.String(), name: t.String(), phoneNumber: t.String() }),
})
export type FacebookConnectAttemptSummary = Static<typeof FacebookConnectAttemptSummary>

export const GetFacebookConnectAttemptsResponse = t.Object({
  items: t.Array(FacebookConnectAttemptSummary),
  meta: t.Object({ count: t.Number() }),
})
export type GetFacebookConnectAttemptsResponse = Static<typeof GetFacebookConnectAttemptsResponse>

export const FacebookConnectAttemptIdParams = t.Object({
  attemptId: t.String({ description: 'The ID of the connect attempt' }),
})
export type FacebookConnectAttemptIdParams = Static<typeof FacebookConnectAttemptIdParams>

export const GetFacebookConnectAttemptResponse = t.Composite([
  FacebookConnectAttemptSummary,
  t.Object({
    context: t.Record(t.String(), t.Unknown(), {
      description: 'Device model, Facebook app installed, tracking permission',
    }),
    steps: t.Array(
      t.Object({
        at: t.Number({ description: 'Milliseconds since the attempt started' }),
        name: t.String(),
        data: t.Optional(t.Record(t.String(), t.Unknown())),
      })
    ),
  }),
])
export type GetFacebookConnectAttemptResponse = Static<typeof GetFacebookConnectAttemptResponse>

export const GetFacebookConnectFailureSummaryQuery = t.Object({
  days: t.Optional(t.Integer({ minimum: 1, maximum: 90, default: 7 })),
})
export type GetFacebookConnectFailureSummaryQuery = Static<
  typeof GetFacebookConnectFailureSummaryQuery
>

export const GetFacebookConnectFailureSummaryResponse = t.Object({
  days: t.Integer(),
  totals: t.Object({
    attempts: t.Integer(),
    succeeded: t.Integer(),
    failed: t.Integer(),
    cancelled: t.Integer(),
    abandoned: t.Integer(),
  }),
  failures: t.Array(
    t.Object({
      failedStep: t.Nullable(t.String()),
      platform: t.String(),
      errorDomain: t.Nullable(t.String()),
      errorCode: t.Nullable(t.String()),
      attempts: t.Integer(),
      users: t.Integer(),
      lastSeenAt: t.Date(),
      exampleMessage: t.Nullable(t.String()),
    })
  ),
})
export type GetFacebookConnectFailureSummaryResponse = Static<
  typeof GetFacebookConnectFailureSummaryResponse
>
