/**
 * Pick the mini app a page belongs to, for the session bridge.
 *
 * The page names its own OIDC client id, but that is a claim; the page URL comes
 * from the host's WebView and is the fact. An app answers for a page only when
 * its `clientUrl` has the page's **origin** — the browser already shares
 * storage and cookies across an origin, so a narrower path check would add no
 * isolation, only break apps that redirect between paths (`/` → `/th/`).
 *
 * When several apps with the same client id share the origin, the one whose
 * base path is the longest prefix of the page path wins; with no prefix match,
 * the first app at that origin does.
 */
export function pickMiniAppForPage<T extends { clientUrl: string }>(
  apps: readonly T[],
  pageUrl: string
): T | null {
  const page = parseUrl(pageUrl)
  if (!page) return null

  let best: { app: T; prefixLength: number } | null = null

  for (const app of apps) {
    const base = parseUrl(app.clientUrl)
    if (!base || base.origin !== page.origin) continue

    const basePath = base.pathname.replace(/\/$/, '')
    const isUnder =
      basePath === '' || page.pathname === basePath || page.pathname.startsWith(`${basePath}/`)
    const prefixLength = isUnder ? basePath.length : -1

    if (!best || prefixLength > best.prefixLength) {
      best = { app, prefixLength }
    }
  }

  return best?.app ?? null
}

function parseUrl(value: string) {
  try {
    const url = new URL(value)
    // Only web pages carry a session; an opaque origin ("null") must never
    // match another opaque origin.
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url
  } catch {
    return null
  }
}
