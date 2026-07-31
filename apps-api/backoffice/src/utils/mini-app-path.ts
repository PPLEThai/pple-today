/**
 * Open a mini app's `clientUrl` at a deep-link `appPath`.
 *
 * The path is relative to the app, so it is joined **under** whatever base path
 * the app registered — the contract `resolveAppLinkPath` states for a
 * notification's `linkPath`, "a path under *this* app". An app registered at
 * `https://host/mp` asking for `attendances` means its own attendances page,
 * not whatever lives at the host's `/attendances`.
 *
 * Both ways into a mini app share this: the browser door (`/miniapp-redirect`)
 * and the in-app token exchange. They disagreed once — the exchange assigned
 * `url.pathname` outright and dropped the app's own prefix, so the same link
 * worked in a browser and signed the user out in the app.
 *
 * Root-hosted apps are unaffected: joining under `/` is what assignment gave.
 */
export function miniAppUrlWithPath(clientUrl: string, appPath: string): URL {
  const url = new URL(clientUrl)
  const basePath = url.pathname.replace(/\/$/, '')
  const extraPath = appPath.replace(/^\/+/, '')

  url.pathname = extraPath ? `${basePath}/${extraPath}` : basePath

  return url
}
