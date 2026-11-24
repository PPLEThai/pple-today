/**
 * Opening a URL a mini app hands over in the system browser (Safari, Chrome),
 * or the app that claims it (packages/mini-app/BRIDGE.md, "Opening a URL in the
 * system browser"). The SDK's `openExternal()` sends `pple:open-external-request`
 * over the bridge and gets an answer.
 *
 * Only pages on the party's own domains may ask (`isTrustedMiniAppOrigin`),
 * only `https:`, `mailto:` and `tel:` URLs are opened, and at most one a second.
 */

export const OPEN_EXTERNAL_REQUEST_TYPE = 'pple:open-external-request'
export const OPEN_EXTERNAL_ACK_TYPE = 'pple:open-external-ack'
export const OPEN_EXTERNAL_RESPONSE_TYPE = 'pple:open-external-response'

/** The schemes the host opens. `http:` is not one: a page on a trusted domain has no need for it. */
export const OPEN_EXTERNAL_SCHEMES = ['https:', 'mailto:', 'tel:'] as const

/** Longer than any URL a page needs, short enough that it is not a payload. */
export const OPEN_EXTERNAL_MAX_URL_LENGTH = 8_192

/** After one URL is opened, the next request is held off for this long (ms). */
export const OPEN_EXTERNAL_COOLDOWN_MS = 1_000

export type OpenExternalDeniedReason =
  /** Not a URL, too long, or a scheme other than https, mailto, tel. */
  | 'invalid-url'
  /** The page is not https on a trusted domain. */
  | 'not-allowed'
  /** Nothing on the device opens it (a `tel:` link on an iPad without calling). */
  | 'unsupported'
  /** Another URL was opened less than a second ago. */
  | 'busy'
  | 'error'

export type OpenExternalAck = { type: typeof OPEN_EXTERNAL_ACK_TYPE; requestId: string }

export type OpenExternalResponse =
  | { type: typeof OPEN_EXTERNAL_RESPONSE_TYPE; requestId: string; status: 'opened' }
  | {
      type: typeof OPEN_EXTERNAL_RESPONSE_TYPE
      requestId: string
      status: 'denied'
      reason: OpenExternalDeniedReason
    }

export type OpenExternalReply = OpenExternalAck | OpenExternalResponse

export const openExternalAckReply = (requestId: string): OpenExternalAck => ({
  type: OPEN_EXTERNAL_ACK_TYPE,
  requestId,
})

export const openExternalOpenedReply = (requestId: string): OpenExternalResponse => ({
  type: OPEN_EXTERNAL_RESPONSE_TYPE,
  requestId,
  status: 'opened',
})

export const openExternalDeniedReply = (
  requestId: string,
  reason: OpenExternalDeniedReason
): OpenExternalResponse => ({
  type: OPEN_EXTERNAL_RESPONSE_TYPE,
  requestId,
  status: 'denied',
  reason,
})

/** Whether a URL was opened at `openedAt` (a `Date.now()`, or `null`) still holds requests off at `now`. */
export function isInOpenExternalCooldown(openedAt: number | null, now: number): boolean {
  return openedAt !== null && now - openedAt < OPEN_EXTERNAL_COOLDOWN_MS
}

/**
 * The URL to open, normalised, or `null` when the host will not open it: not
 * an absolute URL, too long, a scheme other than https, mailto, tel, or an
 * https URL with credentials in it (`https://user:pass@host`), which only
 * serves to disguise where it goes.
 */
export function checkExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  if (value.length > OPEN_EXTERNAL_MAX_URL_LENGTH) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (!(OPEN_EXTERNAL_SCHEMES as readonly string[]).includes(url.protocol)) return null
  if (url.protocol === 'https:' && (!url.hostname || url.username || url.password)) return null
  return url.href
}

function parseJsonObject(data: unknown): Record<string, unknown> | null {
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
 * An SDK `openExternal()` request, or `null` when the message is not one (or
 * has no id to answer). A URL the host will not open comes back with
 * `invalid-url`.
 */
export function parseOpenExternalRequest(
  data: unknown
):
  | { requestId: string; ok: true; url: string }
  | { requestId: string; ok: false; reason: 'invalid-url' }
  | null {
  const m = parseJsonObject(data)
  if (!m || m.type !== OPEN_EXTERNAL_REQUEST_TYPE || m.version !== 1) return null
  const { requestId } = m
  if (typeof requestId !== 'string' || requestId.length === 0 || requestId.length > 256) return null
  const url = checkExternalUrl(m.url)
  return url ? { requestId, ok: true, url } : { requestId, ok: false, reason: 'invalid-url' }
}
