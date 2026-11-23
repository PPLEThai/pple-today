import { MiniApp } from '@pple-today/api-common/dtos'
import { MiniApp as MiniAppModel, MiniAppRole, Prisma } from '@pple-today/database/prisma'

/**
 * Roles, plus the canonical Link Name when the row has one. Replaced names are
 * left out: the response carries only the canonical name (or null).
 */
export const miniAppResponseInclude = {
  miniAppRoles: true,
  linkNames: {
    where: { canonicalForId: { not: null } },
    select: { name: true },
  },
} satisfies Prisma.MiniAppInclude

type MiniAppWithRoles = MiniAppModel & { miniAppRoles: MiniAppRole[] }

/**
 * Project a mini-app row (with its roles) into the public `MiniApp` DTO. Shared
 * by every path that returns a single mini app — admin and platform — so the
 * projection is defined exactly once and cannot drift between them.
 */
export const toMiniAppDto = (miniApp: MiniAppWithRoles): MiniApp => ({
  id: miniApp.id,
  name: miniApp.name,
  slug: miniApp.slug,
  iconUrl: miniApp.icon,
  tagline: miniApp.tagline,
  url: miniApp.clientUrl,
  clientId: miniApp.clientId,
  requiresAuth: miniApp.requiresAuth,
  order: miniApp.order,
  tier: miniApp.tier,
  source: miniApp.source,
  ownerSub: miniApp.ownerSub,
  createdAt: miniApp.createdAt,
  roles: miniApp.miniAppRoles.map(({ role }) => role),
  unlisted: miniApp.unlisted,
})

/**
 * The platform API's mini-app body. `linkName` is the canonical Link Name, or
 * null when the app holds none. The include above is what fills `linkNames`.
 */
export const toPlatformMiniAppDto = (
  miniApp: MiniAppWithRoles & { linkNames: { name: string }[] }
): MiniApp & { linkName: string | null } => ({
  ...toMiniAppDto(miniApp),
  linkName: miniApp.linkNames[0]?.name ?? null,
})
