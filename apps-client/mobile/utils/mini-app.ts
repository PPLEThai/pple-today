import { environment } from '@app/env'

import {
  pathnameToMiniAppRoute,
  resolveIncomingDeepLinkPathname,
  type MiniAppRoutePath,
} from './mini-app-path'

export type { MiniAppRoutePath }
export { pathnameToMiniAppRoute, resolveIncomingDeepLinkPathname }

export function createMiniAppPath(url: string) {
  const urlObj = new URL(url)

  if (urlObj.origin !== environment.EXPO_PUBLIC_ALLOWED_MINI_APP_ORIGIN_REDIRECT) {
    return null
  }

  return pathnameToMiniAppRoute(urlObj.pathname)
}

/**
 * Resolves an incoming system deep link path or URL to an Expo Router path.
 * Used by +native-intent for Universal Links / App Links on the mini-app host.
 */
export function resolveIncomingDeepLinkPath(pathOrUrl: string): string | null {
  const pathnameRoute = resolveIncomingDeepLinkPathname(pathOrUrl)

  if (pathnameRoute) {
    return pathnameRoute
  }

  const trimmed = pathOrUrl.trim()

  if (!trimmed.includes('://')) {
    return null
  }

  try {
    return createMiniAppPath(trimmed)
  } catch {
    return null
  }
}
