/**
 * What PPLE Today offers a mini app page, beyond the session bridge
 * (packages/mini-app/BRIDGE.md, "Capabilities"):
 *
 * - `window.__ppleHost`, set by `hostScript` before the page's own scripts, in
 *   the top frame only. It lists only what this page may use. The host still
 *   checks every request itself; the list is a hint, not trust.
 * - Haptics (`pple:haptic`), fire and forget.
 * - The ready signal (`pple:ready-hold`, `pple:ready`), which keeps the
 *   host's loading screen up until the app says its first screen is there.
 */

/**
 * Pages on these domains (the apex or any subdomain, over https) may save
 * files and play haptics. A preview host such as `*.pages.dev` cannot.
 */
export const TRUSTED_MINI_APP_DOMAINS = ['peoplesparty.or.th', 'pplethai.org', 'ppleth.ai']

/** Whether a page is trusted: https, on the apex or a subdomain of a trusted domain. */
export function isTrustedMiniAppOrigin(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const { protocol, hostname } = new URL(url)
    return (
      protocol === 'https:' &&
      TRUSTED_MINI_APP_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))
    )
  } catch {
    return false
  }
}

/**
 * Script source that defines `trusted()`: `isTrustedMiniAppOrigin` for the
 * page's own `location`. Shared by the injected scripts, which cannot import.
 */
export function trustedPageSnippet(): string {
  return `var DOMAINS = ${JSON.stringify(TRUSTED_MINI_APP_DOMAINS)};
var trusted = function () {
  if (location.protocol !== 'https:') return false;
  for (var i = 0; i < DOMAINS.length; i++) {
    var d = DOMAINS[i];
    if (location.hostname === d || location.hostname.slice(-d.length - 1) === '.' + d) return true;
  }
  return false;
};`
}

export const READY_META_NAME = 'pple-today:ready'
export const READY_HOLD_TYPE = 'pple:ready-hold'
export const READY_TYPE = 'pple:ready'
export const HAPTIC_TYPE = 'pple:haptic'

/**
 * The capabilities half of the host script. In the top frame only (an iframe
 * must not believe a host is there, and the host drops its requests) it sets
 * the frozen `window.__ppleHost = { version: 1, capabilities }`. `saveFile`
 * and `haptics` are listed only on a trusted page; `ready` on every page.
 *
 * Idempotent: it leaves an existing `window.__ppleHost` alone, so it can run
 * twice (before the page's scripts, and again at page finish on Android, where
 * the first run is best effort and may have hit the previous document). It
 * reads the `location` of the document it runs in.
 *
 * An older host never sets the object, so the SDK goes to the browser.
 */
export function hostCapabilitiesScript(): string {
  return `(function(){
if (window.top !== window || window.__ppleHost) return;
${trustedPageSnippet()}
var caps = { ready: 1 };
if (trusted()) { caps.saveFile = 1; caps.haptics = 1; }
window.__ppleHost = Object.freeze({ version: 1, capabilities: Object.freeze(caps) });
})();true;`
}

/**
 * The ready-hold half: posts `pple:ready-hold` when the page has
 * `<meta name="pple-today:ready" content="manual">`, read at
 * `DOMContentLoaded`, or at once when the document is already past loading
 * (Android may inject late). Top frame only. Run it before the page loads, not
 * at page finish: a hold after load end is ignored.
 */
export function readyHoldScript(): string {
  return `(function(){
if (window.top !== window) return;
var rn = window.ReactNativeWebView, post = rn && rn.postMessage ? rn.postMessage.bind(rn) : null;
var hold = function () {
  var m = document.querySelector('meta[name="${READY_META_NAME}"]');
  if (post && m && m.getAttribute('content') === 'manual') {
    post(JSON.stringify({ type: '${READY_HOLD_TYPE}', version: 1 }));
  }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hold);
else hold();
})();true;`
}

/** What the host injects before the page's own scripts, on both platforms. */
export function hostScript(): string {
  return `${hostCapabilitiesScript()}\n${readyHoldScript()}`
}

export const HAPTIC_STYLES = [
  'selection',
  'light',
  'medium',
  'heavy',
  'soft',
  'rigid',
  'success',
  'warning',
  'error',
] as const
export type HapticStyle = (typeof HAPTIC_STYLES)[number]

/** At most this many haptics per `HAPTIC_WINDOW_MS`, per WebView; the rest are dropped. */
export const HAPTIC_LIMIT = 10
export const HAPTIC_WINDOW_MS = 1_000

function parseObject(data: unknown): Record<string, unknown> | null {
  if (typeof data !== 'string') return null
  try {
    const message: unknown = JSON.parse(data)
    return typeof message === 'object' && message !== null
      ? (message as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/**
 * A `pple:haptic` message: `null` when the message is not one, else its style
 * (`null` when the style is unknown, which is ignored).
 */
export function parseHapticMessage(data: unknown): { style: HapticStyle | null } | null {
  const m = parseObject(data)
  if (!m || m.type !== HAPTIC_TYPE || m.version !== 1) return null
  const style = (HAPTIC_STYLES as readonly unknown[]).includes(m.style)
    ? (m.style as HapticStyle)
    : null
  return { style }
}

/**
 * Rate limit: whether a haptic at `now` is allowed given the times of the
 * allowed ones before it, and the history to keep. A dropped one is not counted.
 */
export function allowHaptic(
  history: readonly number[],
  now: number
): { allowed: boolean; history: number[] } {
  const recent = history.filter((t) => now - t < HAPTIC_WINDOW_MS)
  if (recent.length >= HAPTIC_LIMIT) return { allowed: false, history: recent }
  return { allowed: true, history: [...recent, now] }
}

/** A ready-signal message: `hold` (the page keeps the loading screen up) or `ready`; else `null`. */
export function parseReadyMessage(data: unknown): 'hold' | 'ready' | null {
  const m = parseObject(data)
  if (!m || m.version !== 1) return null
  if (m.type === READY_HOLD_TYPE) return 'hold'
  if (m.type === READY_TYPE) return 'ready'
  return null
}
