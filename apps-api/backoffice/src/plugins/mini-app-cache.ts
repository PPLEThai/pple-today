import { Prisma } from '@pple-today/database/prisma'
import Elysia from 'elysia'

const MINI_APP_LIST_CACHE_TTL_MS = 10 * 60 * 1000

type CachedMiniApp = Prisma.MiniAppGetPayload<{ include: { miniAppRoles: true } }>

export class MiniAppListCache {
  private cache: { expiresAt: number; data: CachedMiniApp[] } | null = null

  get(): CachedMiniApp[] | null {
    if (!this.cache) return null
    if (this.cache.expiresAt < Date.now()) {
      this.cache = null
      return null
    }

    return this.cache.data
  }

  set(data: CachedMiniApp[]) {
    this.cache = { expiresAt: Date.now() + MINI_APP_LIST_CACHE_TTL_MS, data }
  }

  invalidate() {
    this.cache = null
  }
}

export const MiniAppListCachePlugin = new Elysia({ name: 'MiniAppListCache' }).decorate(() => ({
  miniAppListCache: new MiniAppListCache(),
}))
