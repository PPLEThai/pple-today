import { MiniApp } from '@pple-today/api-common/dtos'
import { MiniAppTier } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

import { MiniAppInvite, MiniAppInvitePhoneNumber } from '../mini-app/models'

export const GetMiniAppUserCountParams = t.Object({
  id: t.String({ description: 'Mini app id' }),
})
export type GetMiniAppUserCountParams = Static<typeof GetMiniAppUserCountParams>

export const GetMiniAppUserCountResponse = t.Object({
  count: t.Integer({ description: 'Number of App Users who have opened this mini app' }),
})
export type GetMiniAppUserCountResponse = Static<typeof GetMiniAppUserCountResponse>

export const MiniAppIdParams = t.Object({
  id: t.String({ description: 'Mini app id' }),
})
export type MiniAppIdParams = Static<typeof MiniAppIdParams>

export const CreateMiniAppBody = t.Object({
  slug: t.String({ description: 'Slug of the mini app (also its subdomain)' }),
  name: t.String({ description: 'Display name of the mini app' }),
  url: t.String({ description: 'Client URL of the mini app', format: 'uri' }),
  ownerSub: t.String({ description: "The Builder's PPLE ID `sub` — the app's owner" }),
  iconUrl: t.Optional(t.String({ description: 'Public icon URL of the mini app' })),
})
export type CreateMiniAppBody = Static<typeof CreateMiniAppBody>

/**
 * Create response: the mini app plus the two secrets provisioned with it — the
 * OIDC `clientId` (already on `MiniApp`) and the notification key, which is shown
 * exactly once here and only ever stored hashed.
 */
export const CreateMiniAppResponse = t.Composite([
  MiniApp,
  t.Object({
    notificationKey: t.String({
      description: 'App-bound notification key, shown once — store it now',
    }),
  }),
])
export type CreateMiniAppResponse = Static<typeof CreateMiniAppResponse>

export const UpdateMiniAppBody = t.Object({
  name: t.Optional(t.String({ description: 'Display name of the mini app' })),
  url: t.Optional(
    t.String({
      description: 'Client URL of the mini app; changing it re-syncs the Zitadel redirect URIs',
      format: 'uri',
    })
  ),
  iconUrl: t.Optional(t.String({ description: 'Public icon URL of the mini app' })),
})
export type UpdateMiniAppBody = Static<typeof UpdateMiniAppBody>

export const SetTierBody = t.Object({
  tier: t.Enum(MiniAppTier, { description: 'Effective lifecycle tier (DRAFT/BETA/LIVE)' }),
})
export type SetTierBody = Static<typeof SetTierBody>

export const SetRolesBody = t.Object({
  roles: t.Array(t.String({ description: 'A `pple-ad:`-prefixed visibility role' }), {
    description: 'Live-tier visibility roles; an empty array makes the app visible to everyone',
  }),
})
export type SetRolesBody = Static<typeof SetRolesBody>

export const SetNotificationQuotaBody = t.Object({
  dailyQuota: t.Integer({
    minimum: 0,
    description:
      "Sends allowed per day on the app's notification key. Zero suspends the app's notifications outright.",
  }),
})
export type SetNotificationQuotaBody = Static<typeof SetNotificationQuotaBody>

export const SetNotificationQuotaResponse = t.Object({
  dailyQuota: t.Integer({ description: 'The quota now in effect' }),
})
export type SetNotificationQuotaResponse = Static<typeof SetNotificationQuotaResponse>

export const MiniAppResponse = MiniApp
export type MiniAppResponse = Static<typeof MiniAppResponse>

export const RetireMiniAppResponse = t.Object({
  message: t.String({ description: 'Confirmation message of the retirement' }),
})
export type RetireMiniAppResponse = Static<typeof RetireMiniAppResponse>

export const DeleteMiniAppInviteParams = t.Object({
  id: t.String({ description: 'Mini app id' }),
  phoneNumber: t.String({
    description:
      'The invited number, URL-encoded (e.g. %2B66812345678). Local format is accepted too.',
  }),
})
export type DeleteMiniAppInviteParams = Static<typeof DeleteMiniAppInviteParams>

export const ListMiniAppInvitesResponse = t.Array(MiniAppInvite)
export type ListMiniAppInvitesResponse = Static<typeof ListMiniAppInvitesResponse>

export const CreateMiniAppInviteBody = t.Object({
  phoneNumber: MiniAppInvitePhoneNumber,
})
export type CreateMiniAppInviteBody = Static<typeof CreateMiniAppInviteBody>

export const CreateMiniAppInviteResponse = t.Object({
  invite: MiniAppInvite,
  notified: t.Boolean({
    description:
      'Whether the invitation reached a PPLE Today account. False means the number has no account yet (or the push failed), so the person will not see the invitation until they sign up — worth surfacing to the Builder. The invite is recorded either way and waits in the invitee’s inbox, so this is a delivery warning, not a failure.',
  }),
})
export type CreateMiniAppInviteResponse = Static<typeof CreateMiniAppInviteResponse>

export const DeleteMiniAppInviteResponse = t.Object({
  message: t.String(),
})
export type DeleteMiniAppInviteResponse = Static<typeof DeleteMiniAppInviteResponse>
