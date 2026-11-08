import { MiniAppSource, MiniAppTier } from '@pple-today/database/prisma'

/**
 * Platform apps are provisioned and owned by the Provisioner (not built in this
 * repo yet); this admin can see them but must never mutate them, so update and
 * delete both check this before touching the repository.
 */
export const isPlatformManaged = (source: MiniAppSource): boolean =>
  source === MiniAppSource.PLATFORM

/**
 * Whether an admin may set this app's list order. The order only decides where
 * the app sits in PPLE Today's list, so it is meaningful only for an app that
 * is listed: an admin app always, a platform app only once it is Live and not
 * unlisted (a Draft/Beta app is listed to its builders and testers alone, an
 * unlisted one to no one). Order is the one field of a platform app's row the
 * Provisioner never writes, so setting it does not contend with the platform.
 * A retired app is listed nowhere.
 */
export const isOrderEditable = (app: {
  source: MiniAppSource
  tier: MiniAppTier
  unlisted: boolean
  retiredAt: Date | null
}): boolean => {
  if (app.retiredAt !== null) return false
  if (!isPlatformManaged(app.source)) return true
  return app.tier === MiniAppTier.LIVE && !app.unlisted
}
