import { Prisma } from '@pple-today/database/prisma'
import Elysia from 'elysia'

// The cache lives in each API pod's memory, and the API runs up to three
// replicas. `invalidate()` only clears the pod that handled the write (a
// platform retire, rename, or re-list), so every *other* pod keeps serving its
// copy until it expires. The TTL is therefore how long a retired app can stay
// listed, or a rename stay unseen, on the phone — keep it short. The list query
// is one small indexed read, so refreshing it this often costs little.
const MINI_APP_LIST_CACHE_TTL_MS = 30 * 1000

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
