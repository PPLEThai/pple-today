import { MiniApp } from '@pple-today/api-common/dtos'
import { MiniAppInviteStatus } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const ListMiniAppsResponse = t.Array(
  t.Pick(MiniApp, ['slug', 'name', 'iconUrl', 'order', 'url', 'requiresAuth', 'tier'])
)
export type ListMiniAppsResponse = Static<typeof ListMiniAppsResponse>

export const ListMiniAppsQuery = t.Object({
  role: t.Optional(
    t.String({
      description:
        'Deprecated and ignored. Kept for backward compatibility with older app versions; mini apps are filtered by the active role resolved from SSO AD.',
    })
  ),
})
export type ListMiniAppsQuery = Static<typeof ListMiniAppsQuery>

export const MiniAppInvitePhoneNumber = t.String({
  description:
    'Thai mobile number in +66XXXXXXXXX or 0XXXXXXXXX format (a leading zero is normalised to +66).',
})

export const MiniAppInvite = t.Object({
  miniAppId: t.String({ description: 'ID of the mini app the tester is invited to' }),
  phoneNumber: MiniAppInvitePhoneNumber,
  status: t.Enum(MiniAppInviteStatus, {
    description: 'PENDING until the invitee answers; then ACCEPTED or DECLINED',
  }),
  userId: t.Nullable(
    t.String({
      description:
        "The invitee's account, bound when they accept. Access is matched on this, never on the phone number, so changing their number does not revoke it.",
    })
  ),
  createdAt: t.Date({ description: 'When the invitation was sent' }),
  respondedAt: t.Nullable(t.Date({ description: 'When the invitee answered, if they have' })),
})
export type MiniAppInvite = Static<typeof MiniAppInvite>

export const MiniAppInviteParams = t.Object({
  miniAppId: t.String({ description: 'ID of the mini app' }),
})
export type MiniAppInviteParams = Static<typeof MiniAppInviteParams>

export const ListMyMiniAppInvitesResponse = t.Array(
  t.Object({
    miniAppId: t.String({ description: 'ID of the mini app you are invited to' }),
    miniAppName: t.String({ description: 'Name to show on the invitation card' }),
    miniAppSlug: t.String({ description: 'Slug of the mini app' }),
    createdAt: t.Date({ description: 'When you were invited' }),
  })
)
export type ListMyMiniAppInvitesResponse = Static<typeof ListMyMiniAppInvitesResponse>

export const RespondToMiniAppInviteResponse = MiniAppInvite
export type RespondToMiniAppInviteResponse = Static<typeof RespondToMiniAppInviteResponse>
