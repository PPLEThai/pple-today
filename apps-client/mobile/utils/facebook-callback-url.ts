/**
 * Facebook Login returns to the app through the `fb<appId>://` URL scheme (e.g.
 * `fb123456://authorize/#access_token=…`). The Facebook SDK consumes that URL
 * natively (via `FacebookAppDelegate`), but Expo Router sees it too and would
 * route it as an unknown path, landing the user on the not-found screen.
 */
export function isFacebookCallbackUrl(url: string): boolean {
  return /^fb\d+:/i.test(url)
}
