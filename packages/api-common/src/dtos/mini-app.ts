import { MiniAppSource, MiniAppTier } from '@pple-today/database/prisma'
import { Static, t } from 'elysia'

export const MiniApp = t.Object({
  id: t.String({ description: 'ID of the mini app' }),
  slug: t.String({ description: 'Slug of the mini app' }),
  name: t.String({ description: 'Name of the mini app' }),
  iconUrl: t.Nullable(
    t.String({
      description: 'Icon URL of the mini app',
    })
  ),
  url: t.String({
    description: 'Client URL of the mini app',
    format: 'uri',
  }),
  clientId: t.String({ description: 'Client ID of the mini app' }),
  requiresAuth: t.Boolean({
    description: 'Whether the mini app requires an authenticated user (token exchange)',
  }),
  order: t.Number({ description: 'Order of the mini app' }),
  tier: t.Enum(MiniAppTier, {
    description: 'Lifecycle tier of the mini app (DRAFT/BETA/LIVE); clients badge non-LIVE apps',
  }),
  source: t.Enum(MiniAppSource, {
    description:
      'Who owns the mini app row (ADMIN = manually managed here; PLATFORM = provisioned by the PPLE Platform and read-only in this admin)',
  }),
  ownerSub: t.Nullable(
    t.String({ description: "Builder's PPLE ID sub; set only when source = PLATFORM" })
  ),
  createdAt: t.Date({ description: 'Creation date of the mini app' }),
  roles: t.Array(t.String({ description: 'Roles assigned to the mini app' })),
})
export type MiniApp = Static<typeof MiniApp>
