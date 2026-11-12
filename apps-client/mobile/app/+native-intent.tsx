import { isFacebookCallbackUrl } from '@app/utils/facebook-callback-url'
import { resolveIncomingDeepLinkPath } from '@app/utils/mini-app'

/**
 * Rewrites Universal Link / App Link paths on the mini-app host into Expo Router routes.
 * @see https://docs.expo.dev/router/advanced/native-intent/
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  try {
    // The Facebook SDK handles its login callback natively; returning null keeps
    // Expo Router from navigating to it (which would show the not-found screen).
    if (isFacebookCallbackUrl(path)) {
      return null
    }

    const miniAppRoute = resolveIncomingDeepLinkPath(path)

    if (miniAppRoute) {
      return miniAppRoute
    }

    return path
  } catch {
    return '/'
  }
}
