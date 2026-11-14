// อาสาประชาชน — embedded as the อาสา tab instead of opened as a mini app screen.
export const VOLUNTEER_MINI_APP_SLUG = 'noble-aqua-dove'

export type MiniAppRoutePath = `/mini-app/${string}` | '/volunteer' | `/volunteer?path=${string}`

/**
 * Maps a mini-app redirect pathname (e.g. `/my-slug/nested/path`) to an in-app route.
 *
 * Every caller feeds this server data, and an API older than the field it reads
 * omits it entirely — so an absent pathname resolves to "no route" rather than
 * throwing on a value TypeScript was told would be there.
 */
export function pathnameToMiniAppRoute(pathname: string): MiniAppRoutePath | null {
  if (!pathname) {
    return null
  }

  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`

  if (normalized === '/' || normalized === '') {
    return null
  }

  const segments = normalized.split('/').filter(Boolean)
  const slug = segments[0]

  if (!slug) {
    return null
  }

  return miniAppRoute(slug, segments.slice(1).join('/'))
}

/**
 * The in-app route that opens the mini app `slug`, at `path` within it.
 * อาสาประชาชน opens in its own tab: a second copy pushed over the feed would be
 * a separate WebView with its own session and history.
 */
export function miniAppRoute(slug: string, path?: string): MiniAppRoutePath {
  if (slug === VOLUNTEER_MINI_APP_SLUG) {
    return path ? `/volunteer?path=${path}` : '/volunteer'
  }

  return path ? `/mini-app/${slug}?path=${path}` : `/mini-app/${slug}`
}

/**
 * Opens `baseUrl` at a deep-link `path`, which is relative to the mini app.
 *
 * The path is joined **under** whatever base path the app registered, not
 * written over it: an app asking for `attendances` means its own attendances
 * page, and the eight kaitom slugs all live on sub-paths of one host. Assigning
 * `url.pathname` instead would drop the app's own prefix and land the user
 * outside its module. Root-hosted apps see no difference.
 */
export function miniAppUrlWithPath(baseUrl: string, path?: string): string {
  const url = new URL(baseUrl)

  if (path) {
    const base = url.pathname.replace(/\/$/, '')
    const relative = path.replace(/^\//, '')
    url.pathname = relative ? `${base}/${relative}` : base || '/'
  }

  return url.toString()
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
