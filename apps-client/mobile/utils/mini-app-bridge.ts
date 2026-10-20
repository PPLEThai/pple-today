/**
 * The host side of the mini-app session bridge (packages/mini-app/BRIDGE.md).
 *
 * A mini app asks for its session (or for a บทบาท switch) with `window.ReactNativeWebView.postMessage`
 * and the host answers by injecting a script that re-dispatches the answer as a
 * synthetic `message` event. This module holds the pieces of that exchange that
 * do not need React or a WebView: reading the request, writing the reply
 * script, and remembering sessions already handed out.
 */

export const SESSION_REQUEST_TYPE = 'pple:session-request'
export const SESSION_ACK_TYPE = 'pple:session-ack'
export const SESSION_RESPONSE_TYPE = 'pple:session-response'
export const ROLE_SWITCH_REQUEST_TYPE = 'pple:role-switch-request'
export const ROLE_SWITCH_ACK_TYPE = 'pple:role-switch-ack'
export const ROLE_SWITCH_RESPONSE_TYPE = 'pple:role-switch-response'

export interface MiniAppSession {
  accessToken: string
  idToken: string
  tokenType: string
  /** Seconds until the access token expires, counted from when it was handed out. */
  expiresIn: number
}

export interface SessionRequest {
  type: typeof SESSION_REQUEST_TYPE
  version: 1
  requestId: string
  clientId: string
}

export type SessionDeniedReason =
  | 'not-found'
  | 'role-declined'
  | 'not-signed-in'
  | 'no-auth-required'
  | 'error'

export type SessionAck = { type: typeof SESSION_ACK_TYPE; requestId: string }

export type SessionResponse =
  | {
      type: typeof SESSION_RESPONSE_TYPE
      requestId: string
      status: 'ok'
      session: MiniAppSession
    }
  | {
      type: typeof SESSION_RESPONSE_TYPE
      requestId: string
      status: 'denied'
      reason: SessionDeniedReason
    }

export interface RoleSwitchRequest {
  type: typeof ROLE_SWITCH_REQUEST_TYPE
  version: 1
  requestId: string
  clientId: string
}

export type RoleSwitchDeniedReason =
  | 'not-signed-in'
  | 'not-found'
  | 'no-eligible-persons'
  | 'busy'
  | 'error'

export type RoleSwitchAck = { type: typeof ROLE_SWITCH_ACK_TYPE; requestId: string }

export type RoleSwitchResponse =
  | {
      type: typeof ROLE_SWITCH_RESPONSE_TYPE
      requestId: string
      status: 'switched'
      activePersonId: number
      /** Absent for apps that do not require authentication. */
      session?: MiniAppSession
    }
  | { type: typeof ROLE_SWITCH_RESPONSE_TYPE; requestId: string; status: 'unchanged' }
  | { type: typeof ROLE_SWITCH_RESPONSE_TYPE; requestId: string; status: 'cancelled' }
  | {
      type: typeof ROLE_SWITCH_RESPONSE_TYPE
      requestId: string
      status: 'denied'
      reason: RoleSwitchDeniedReason
    }

export type BridgeRequest = SessionRequest | RoleSwitchRequest

export type BridgeReply = SessionAck | SessionResponse | RoleSwitchAck | RoleSwitchResponse

// Ids are echoed back into the page and used as map keys; anything longer than
// this is not an SDK talking, so it is not worth holding on to.
const MAX_ID_LENGTH = 256

const isId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH

/**
 * The bridge request inside a WebView message, or `null` for anything else.
 *
 * Pages may post messages of their own through the same channel, so a message
 * that is not ours is ignored rather than answered — there is no requestId to
 * answer it with anyway. Unknown versions are ignored for the same reason: an
 * SDK newer than this host waits out the ack and falls back.
 */
export function parseBridgeRequest(data: unknown): BridgeRequest | null {
  if (typeof data !== 'string') return null

  let message: unknown
  try {
    message = JSON.parse(data)
  } catch {
    return null
  }

  if (typeof message !== 'object' || message === null) return null
  const { type, version, requestId, clientId } = message as Record<string, unknown>

  if (type !== SESSION_REQUEST_TYPE && type !== ROLE_SWITCH_REQUEST_TYPE) return null
  if (version !== 1) return null
  if (!isId(requestId) || !isId(clientId)) return null

  return { type, version, requestId, clientId }
}

/** The session request inside a WebView message, or `null` for anything else. */
export function parseSessionRequest(data: unknown): SessionRequest | null {
  const request = parseBridgeRequest(data)
  return request?.type === SESSION_REQUEST_TYPE ? request : null
}

/** The role-switch request inside a WebView message, or `null` for anything else. */
export function parseRoleSwitchRequest(data: unknown): RoleSwitchRequest | null {
  const request = parseBridgeRequest(data)
  return request?.type === ROLE_SWITCH_REQUEST_TYPE ? request : null
}

/**
 * The web origin of a URL, or `null` when it has none worth trusting — an
 * unparsable string, or a non-http(s) page (`about:blank`, `data:`, `file:`)
 * whose origin is opaque and so cannot be told apart from another one.
 */
export function originOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    return parsed.origin
  } catch {
    return null
  }
}

/** The host name shown in the top bar for a page no known app claims. */
export function hostnameOf(url: string | null | undefined): string | null {
  if (!originOf(url)) return null
  return new URL(url!).hostname
}

/**
 * The page URL to resolve the requesting app with.
 *
 * Both inputs come from the native layer, never from the page's message. On
 * Android the message event carries only the sender's *origin*
 * (`WebMessageListener`'s `sourceOrigin`), which loses the base path the server
 * uses to pick between apps sharing an origin. When the main frame's last
 * reported URL is on that same origin, it is the better answer — same origin is
 * the security boundary, so the path adds precision, not trust. Otherwise
 * (an iframe on another origin, or navigation state that has not caught up yet)
 * the event's own URL stands.
 */
export function resolvePageUrl(eventUrl: string, mainFrameUrl: string | null | undefined): string {
  const eventOrigin = originOf(eventUrl)
  if (eventOrigin && mainFrameUrl && originOf(mainFrameUrl) === eventOrigin) {
    return mainFrameUrl
  }
  return eventUrl
}

/**
 * JSON that is also safe to drop into a script source.
 *
 * `JSON.stringify` output is valid JS on modern engines, but `<` would let a
 * `</script>` inside a token or app name end an inline script, and U+2028 /
 * U+2029 are line terminators in older JS parsers. All three become `\u` escapes,
 * which decode back to the same string.
 */
export function toScriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/**
 * The script `injectJavaScript` runs to deliver a reply.
 *
 * Replies are asynchronous — the user may answer the role prompt a minute
 * later — and by then the WebView may be showing another site. The origin check
 * runs in the page at delivery time, so a session never lands on an origin
 * other than the one that asked for it. The trailing `true` keeps iOS from
 * complaining about a non-serialisable completion value.
 */
export function buildReplyScript(origin: string, reply: BridgeReply): string {
  return (
    `(function(){ if (location.origin !== ${toScriptJson(origin)}) return; ` +
    `window.dispatchEvent(new MessageEvent('message', { data: ${toScriptJson(reply)} })); })(); true;`
  )
}

export const ackReply = (requestId: string): SessionAck => ({ type: SESSION_ACK_TYPE, requestId })

export const okReply = (requestId: string, session: MiniAppSession): SessionResponse => ({
  type: SESSION_RESPONSE_TYPE,
  requestId,
  status: 'ok',
  session,
})

export const deniedReply = (requestId: string, reason: SessionDeniedReason): SessionResponse => ({
  type: SESSION_RESPONSE_TYPE,
  requestId,
  status: 'denied',
  reason,
})

export const roleSwitchAckReply = (requestId: string): RoleSwitchAck => ({
  type: ROLE_SWITCH_ACK_TYPE,
  requestId,
})

export const roleSwitchSwitchedReply = (
  requestId: string,
  activePersonId: number,
  session: MiniAppSession | null
): RoleSwitchResponse => ({
  type: ROLE_SWITCH_RESPONSE_TYPE,
  requestId,
  status: 'switched',
  activePersonId,
  // Omitted rather than `null`: a public app, or a re-exchange that failed
  // after the switch itself went through.
  ...(session ? { session } : {}),
})

export const roleSwitchUnchangedReply = (requestId: string): RoleSwitchResponse => ({
  type: ROLE_SWITCH_RESPONSE_TYPE,
  requestId,
  status: 'unchanged',
})

export const roleSwitchCancelledReply = (requestId: string): RoleSwitchResponse => ({
  type: ROLE_SWITCH_RESPONSE_TYPE,
  requestId,
  status: 'cancelled',
})

export const roleSwitchDeniedReply = (
  requestId: string,
  reason: RoleSwitchDeniedReason
): RoleSwitchResponse => ({
  type: ROLE_SWITCH_RESPONSE_TYPE,
  requestId,
  status: 'denied',
  reason,
})

/** The API error code inside a rejected request, or `null` when there is none. */
export function apiErrorCode(error: unknown): string | null {
  const code = (error as { value?: { error?: { code?: unknown } } } | null)?.value?.error?.code
  return typeof code === 'string' ? code : null
}

/**
 * Which listed mini app a page belongs to, judged by origin.
 *
 * Mirrors the server's rule for the bridge: same origin first, then the longest
 * base path that prefixes the page's path. Used only to label the top bar
 * before (or without) a bridge request — the session itself is always resolved
 * by the server.
 */
export function findMiniAppForUrl<T extends { url: string }>(
  apps: readonly T[] | null | undefined,
  pageUrl: string
): T | null {
  const origin = originOf(pageUrl)
  if (!apps || !origin) return null

  const pagePath = new URL(pageUrl).pathname
  let best: { app: T; pathLength: number } | null = null
  let firstOnOrigin: T | null = null

  for (const app of apps) {
    if (originOf(app.url) !== origin) continue
    firstOnOrigin ??= app
    const basePath = new URL(app.url).pathname.replace(/\/+$/, '')
    const prefixes = basePath === '' || pagePath === basePath || pagePath.startsWith(`${basePath}/`)
    if (prefixes && (!best || basePath.length > best.pathLength)) {
      best = { app, pathLength: basePath.length }
    }
  }

  return best?.app ?? firstOnOrigin
}

/** Sessions with less than this left are fetched again rather than reused. */
export const SESSION_REUSE_MARGIN_MS = 60_000

/**
 * Sessions already handed out, per app (`clientId`) and origin, so a page that
 * asks again — every route change in some SDKs — does not mint a token each
 * time.
 */
export class SessionCache {
  private entries = new Map<string, { session: MiniAppSession; expiresAt: number }>()

  constructor(private readonly now: () => number = Date.now) {}

  static key(clientId: string, origin: string) {
    // A separator that cannot occur in an origin, so no two pairs collide.
    return `${clientId} ${origin}`
  }

  get(clientId: string, origin: string): MiniAppSession | null {
    const key = SessionCache.key(clientId, origin)
    const entry = this.entries.get(key)
    if (!entry) return null

    const remaining = entry.expiresAt - this.now()
    if (remaining <= SESSION_REUSE_MARGIN_MS) {
      this.entries.delete(key)
      return null
    }

    // The page schedules its refresh from `expiresIn`, so it gets what is left,
    // not what the token started with.
    return { ...entry.session, expiresIn: Math.floor(remaining / 1000) }
  }

  set(clientId: string, origin: string, session: MiniAppSession) {
    this.entries.set(SessionCache.key(clientId, origin), {
      session,
      expiresAt: this.now() + session.expiresIn * 1000,
    })
  }

  clear() {
    this.entries.clear()
  }
}
