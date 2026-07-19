import { MiniAppSource } from '@pple-today/database/prisma'

/**
 * Platform apps are provisioned and owned by the Provisioner (not built in this
 * repo yet); this admin can see them but must never mutate them, so update and
 * delete both check this before touching the repository.
 */
export const isPlatformManaged = (source: MiniAppSource): boolean =>
  source === MiniAppSource.PLATFORM
