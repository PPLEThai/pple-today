export type MiniAppRoutePath = `/mini-app/${string}`

/**
 * Maps a mini-app redirect pathname (e.g. `/my-slug/nested/path`) to an in-app route.
 */
export function pathnameToMiniAppRoute(pathname: string): MiniAppRoutePath | null {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`

  if (normalized === '/' || normalized === '') {
    return null
  }

  const segments = normalized.split('/').filter(Boolean)
  const slug = segments[0]

  if (!slug) {
    return null
  }

  const subPath = segments.slice(1).join('/')

  return subPath ? (`/mini-app/${slug}?path=${subPath}` as const) : (`/mini-app/${slug}` as const)
}

/**
 * Resolves an incoming system deep link path to an Expo Router path (pathname only).
 */
export function resolveIncomingDeepLinkPathname(path: string): string | null {
  const trimmed = path.trim()

  if (!trimmed || trimmed.includes('://')) {
    return null
  }

  return pathnameToMiniAppRoute(trimmed)
}
