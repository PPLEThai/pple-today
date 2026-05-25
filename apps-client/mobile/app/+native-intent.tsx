import { resolveIncomingDeepLinkPath } from '@app/utils/mini-app'

/**
 * Rewrites Universal Link / App Link paths on the mini-app host into Expo Router routes.
 * @see https://docs.expo.dev/router/advanced/native-intent/
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    const miniAppRoute = resolveIncomingDeepLinkPath(path)

    if (miniAppRoute) {
      return miniAppRoute
    }

    return path
  } catch {
    return '/'
  }
}
