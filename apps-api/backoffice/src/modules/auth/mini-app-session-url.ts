import { miniAppUrlWithPath } from '../../utils/mini-app-path'

/**
 * Build the URL the mobile WebView opens for a mini-app session: the app at its
 * deep-link path, carrying the exchanged tokens.
 *
 * The path join is `miniAppUrlWithPath`, shared with the browser door — the two
 * ways into a mini app must resolve the same link to the same page.
 */
export function buildMiniAppSessionUrl(
  clientUrl: string,
  tokens: {
    accessToken: string
    expiresIn: number
    idToken: string
    tokenType: string
  },
  path?: string
) {
  const url = miniAppUrlWithPath(clientUrl, path ?? '')

  url.searchParams.append('access_token', tokens.accessToken)
  url.searchParams.append('expires_in', tokens.expiresIn.toString())
  url.searchParams.append('id_token', tokens.idToken)
  url.searchParams.append('token_type', tokens.tokenType)

  return url.toString()
}
