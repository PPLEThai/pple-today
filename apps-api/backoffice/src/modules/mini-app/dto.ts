import { MiniApp } from '@pple-today/api-common/dtos'
import { MiniApp as MiniAppModel, MiniAppRole } from '@pple-today/database/prisma'

/**
 * Project a mini-app row (with its roles) into the public `MiniApp` DTO. Shared
 * by every path that returns a single mini app — admin and platform — so the
 * projection is defined exactly once and cannot drift between them.
 */
export const toMiniAppDto = (miniApp: MiniAppModel & { miniAppRoles: MiniAppRole[] }): MiniApp => ({
  id: miniApp.id,
  name: miniApp.name,
  slug: miniApp.slug,
  iconUrl: miniApp.icon,
  url: miniApp.clientUrl,
  clientId: miniApp.clientId,
  requiresAuth: miniApp.requiresAuth,
  order: miniApp.order,
  tier: miniApp.tier,
  source: miniApp.source,
  ownerSub: miniApp.ownerSub,
  createdAt: miniApp.createdAt,
  roles: miniApp.miniAppRoles.map(({ role }) => role),
})
