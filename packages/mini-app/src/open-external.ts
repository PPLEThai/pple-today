import { hasCapability, requestOpenExternalFromHost } from './bridge'
import type { OpenExternalDeniedReason } from './models'

// See BRIDGE.md ("Opening a URL in the system browser").

const SCHEMES = ['https:', 'mailto:', 'tel:']
const MAX_URL_LENGTH = 8_192

/**
 * How an `openExternal()` call ended.
 *
 * - `opened`: the URL was handed on. Inside PPLE Today, the system took it
 *   (the browser, or the app that claims the link, opened). In a browser, the
 *   browser was asked to open it; whether a popup blocker stopped it is not
 *   reported.
 * - `failed`: nothing was opened; `reason` says why.
 *   - `invalid-url`: not a URL, or not `https:`, `mailto:` or `tel:`.
 *   - `not-allowed`: PPLE Today does not let this page open URLs.
 *   - `unsupported`: nothing on the device opens it (`tel:` on an iPad).
 *   - `busy`: PPLE Today opened another URL less than a second ago.
 *   - `error`: PPLE Today did not answer, or the browser threw.
 */
export type OpenExternalResult =
  | { status: 'opened' }
  | { status: 'failed'; reason: OpenExternalDeniedReason }

/** The absolute URL to open, or `null` when it is not one `openExternal()` takes. */
function checkUrl(value: string): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_URL_LENGTH) return null
  let url: URL
  try {
    url = new URL(value, window.location.href)
  } catch {
    return null
  }
  if (!SCHEMES.includes(url.protocol)) return null
  if (url.protocol === 'https:' && (!url.hostname || url.username || url.password)) return null
  return url.href
}

/**
 * Opens a URL outside the app: in the system browser (Safari, Chrome), or in
 * the app that claims the link, such as a meeting app. Use it for a
 * third-party service that needs its own login, cookies or camera and
 * microphone, which it does not get inside PPLE Today's WebView. The user
 * switches back to PPLE Today as to any other app.
 *
 * Takes `https:`, `mailto:` and `tel:` URLs; a relative URL is resolved
 * against the page.
 *
 * Inside PPLE Today (with the `openExternal` capability, listed on the party's
 * own domains) the host opens it. Anywhere else — a browser, an older PPLE
 * Today, a page PPLE Today does not trust — `window.open(url, '_blank',
 * 'noopener')`, or a navigation for `mailto:` and `tel:`. In an older PPLE
 * Today on iPhone, that `window.open` loads the URL in the mini app's own
 * WebView (see BRIDGE.md).
 *
 * Call it from a tap: a browser blocks a popup that does not come from one.
 * It needs no `init()`. Never rejects.
 */
export async function openExternal(url: string): Promise<OpenExternalResult> {
  try {
    const href = checkUrl(url)
    if (!href) return { status: 'failed', reason: 'invalid-url' }

    // A host that offers `openExternal` is there, so whatever happens next is
    // its answer. No fallback, or the URL could open twice.
    if (hasCapability('openExternal')) {
      const response = await requestOpenExternalFromHost(href)
      if (response.status === 'opened') return { status: 'opened' }
      if (response.status === 'denied') return { status: 'failed', reason: response.reason }
      return { status: 'failed', reason: 'error' }
    }

    if (href.startsWith('https:')) {
      // With `noopener` it returns null whether or not a window opened.
      window.open(href, '_blank', 'noopener')
    } else {
      // `mailto:` and `tel:` hand off to the mail or phone app without leaving the page.
      window.location.href = href
    }
    return { status: 'opened' }
  } catch (error) {
    console.warn('[PPLE Mini App] Open external failed', error)
    return { status: 'failed', reason: 'error' }
  }
}
