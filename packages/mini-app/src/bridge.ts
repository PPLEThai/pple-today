import {
  BridgeResponseSchema,
  BridgeSession,
  RoleSwitchResponse,
  RoleSwitchResponseSchema,
  SaveFileResponse,
  SaveFileResponseSchema,
} from './models'

// See BRIDGE.md for the protocol.

/**
 * The User-Agent PPLE Today's WebView sends to a mini-app, e.g.
 * `PPLETodayApp/2.10.0 MiniApp`. Each version part may have several digits.
 */
const MINI_APP_USER_AGENT = /PPLETodayApp\/(\d+\.\d+\.\d+)\s+MiniApp/
const ACK_TIMEOUT_MS = 3_000
// A save request carries up to ~13 MB that the host must receive and parse
// before it acks, so its ack gets far longer than a session request's.
const SAVE_FILE_ACK_TIMEOUT_MS = 30_000
// The host may be showing the user a role prompt before it answers.
const RESPONSE_TIMEOUT_MS = 120_000

// Declared locally rather than globally so the published typings do not
// leak a `window.ReactNativeWebView` into every consumer.
type ReactNativeWebViewWindow = Window & {
  ReactNativeWebView?: { postMessage?: (message: string) => void }
  // Set by PPLE Today's injected script, in the top frame only.
  __ppleHost?: unknown
}

export function isMiniAppUserAgent() {
  return MINI_APP_USER_AGENT.test(navigator.userAgent)
}

/**
 * Whether the host app can be asked for a session. The WebView only exposes
 * `ReactNativeWebView` when the host registered a message handler, so its
 * presence is what tells a bridge-capable host from an older URL-only one.
 */
export function hasBridge() {
  return (
    isMiniAppUserAgent() &&
    typeof (window as ReactNativeWebViewWindow).ReactNativeWebView?.postMessage === 'function'
  )
}

/**
 * What PPLE Today offers this page, as `{ name: version }`; `{}` outside PPLE
 * Today, without the bridge, or when `window.__ppleHost` is malformed.
 *
 * The host's injected script sets `window.__ppleHost = { version: 1,
 * capabilities: { … } }` in the top frame, listing only what this page may
 * use. It is read at call time, not cached: on Android the script runs at the
 * start of the page load, best effort, so it can land after the page's first
 * scripts. The host still checks every request itself; this list is a hint.
 */
export function getHostCapabilities(): Record<string, number> {
  if (!hasBridge()) return {}
  const host = (window as ReactNativeWebViewWindow).__ppleHost
  if (typeof host !== 'object' || host === null) return {}
  const capabilities = (host as { capabilities?: unknown }).capabilities
  if (typeof capabilities !== 'object' || capabilities === null) return {}
  const result: Record<string, number> = {}
  for (const [name, version] of Object.entries(capabilities)) {
    if (typeof version === 'number' && Number.isFinite(version)) result[name] = version
  }
  return result
}

/**
 * Whether PPLE Today offers `name` to this page at `minVersion` or newer.
 * A capability's protocol changes only by raising its number.
 */
export function hasCapability(name: string, minVersion = 1): boolean {
  const version = getHostCapabilities()[name]
  return typeof version === 'number' && version >= minVersion
}

/** Sends a message the host answers with nothing: no ack, no reply. Never throws. */
export function postToHost(message: { type: string } & Record<string, unknown>): void {
  try {
    ;(window as ReactNativeWebViewWindow).ReactNativeWebView?.postMessage?.(
      JSON.stringify({ ...message, version: 1 })
    )
  } catch {
    // Nothing to do: the host is not there.
  }
}

function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function parseMessageData(data: unknown): Record<string, unknown> | null {
  let value = data
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value)
    } catch {
      return null
    }
  }
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

type BridgeFailure = 'no-ack' | 'timeout' | 'invalid-response' | 'unreachable'

type BridgeOutcome<T> = { ok: true; data: T } | { ok: false; failure: BridgeFailure }

/**
 * One request/response exchange with the host: post `message`, wait for the
 * ack, then for the response. Never rejects.
 *
 * `responseTimeoutMs: null` waits for the response indefinitely — for requests
 * the user answers (a dialog), where any timeout would cut them off mid-choice.
 */
function sendBridgeRequest<T>(options: {
  message: { type: string } & Record<string, unknown>
  ackType: string
  responseType: string
  parseResponse: (data: unknown) => T | null
  responseTimeoutMs: number | null
  /** How long to wait for the ack. Defaults to 3 s. */
  ackTimeoutMs?: number
}): Promise<BridgeOutcome<T>> {
  const {
    message,
    ackType,
    responseType,
    parseResponse,
    responseTimeoutMs,
    ackTimeoutMs = ACK_TIMEOUT_MS,
  } = options

  return new Promise((resolve) => {
    const requestId = createRequestId()
    let responseTimer: ReturnType<typeof setTimeout> | undefined

    const finish = (outcome: BridgeOutcome<T>) => {
      window.removeEventListener('message', onMessage)
      clearTimeout(ackTimer)
      clearTimeout(responseTimer)
      resolve(outcome)
    }

    function onMessage(event: MessageEvent) {
      // The host injects a synthetic event, which has no source. A real
      // postMessage (from an iframe or another window) always has one, so
      // requiring null keeps third-party content from answering for the host.
      if (event.source !== null) return

      const data = parseMessageData(event.data)
      if (!data || data.requestId !== requestId) return

      if (data.type === ackType) {
        clearTimeout(ackTimer)
        clearTimeout(responseTimer)
        if (responseTimeoutMs !== null) {
          responseTimer = setTimeout(
            () => finish({ ok: false, failure: 'timeout' }),
            responseTimeoutMs
          )
        }
        return
      }

      // Anything else with this requestId is ignored, so a newer host can add
      // message types without breaking this SDK.
      if (data.type !== responseType) return

      const response = parseResponse(data)
      finish(response ? { ok: true, data: response } : { ok: false, failure: 'invalid-response' })
    }

    window.addEventListener('message', onMessage)
    const ackTimer = setTimeout(() => finish({ ok: false, failure: 'no-ack' }), ackTimeoutMs)

    try {
      ;(window as ReactNativeWebViewWindow).ReactNativeWebView?.postMessage?.(
        JSON.stringify({ ...message, version: 1, requestId })
      )
    } catch {
      finish({ ok: false, failure: 'unreachable' })
    }
  })
}

const FAILURE_WARNINGS: Record<BridgeFailure, string> = {
  'no-ack': 'host did not acknowledge the request',
  timeout: 'host did not respond in time',
  'invalid-response': 'invalid response from host',
  unreachable: 'could not reach the host',
}

/**
 * Asks the host app for the session of the mini app on screen.
 *
 * Resolves `null` — never rejects — when the host denies, does not answer, or
 * sends something malformed, so callers can fall back without a try/catch.
 */
export async function requestSessionFromHost(clientId: string): Promise<BridgeSession | null> {
  const outcome = await sendBridgeRequest({
    message: { type: 'pple:session-request', clientId },
    ackType: 'pple:session-ack',
    responseType: 'pple:session-response',
    parseResponse: (data) => BridgeResponseSchema.safeParse(data).data ?? null,
    responseTimeoutMs: RESPONSE_TIMEOUT_MS,
  })

  if (!outcome.ok) {
    console.warn(`[PPLE Mini App] Session bridge: ${FAILURE_WARNINGS[outcome.failure]}`)
    return null
  }

  if (outcome.data.status === 'ok') return outcome.data.session

  console.warn(`[PPLE Mini App] Session bridge: host denied the session (${outcome.data.reason})`)
  return null
}

/**
 * Asks the host to show its role picker. Resolves once the user has chosen —
 * there is deliberately no response timeout — or with `unavailable` when the
 * host cannot be reached.
 */
export async function requestRoleSwitchFromHost(
  clientId: string
): Promise<RoleSwitchResponse | { status: 'unavailable'; reason: BridgeFailure }> {
  const outcome = await sendBridgeRequest({
    message: { type: 'pple:role-switch-request', clientId },
    ackType: 'pple:role-switch-ack',
    responseType: 'pple:role-switch-response',
    parseResponse: (data) => RoleSwitchResponseSchema.safeParse(data).data ?? null,
    responseTimeoutMs: null,
  })

  if (!outcome.ok) {
    console.warn(`[PPLE Mini App] Role switch: ${FAILURE_WARNINGS[outcome.failure]}`)
    return { status: 'unavailable', reason: outcome.failure }
  }

  return outcome.data
}

/**
 * Hands a file to the host, which opens the share sheet with it (Save Image,
 * Save to Files, another app). Resolves once the sheet has closed — there is
 * no response timeout, as the user may take their time — or with
 * `unavailable` when the host does not ack within 30 s. Call it only when
 * `hasCapability('saveFile')`: it is the one host that is there, so there is no
 * fallback.
 */
export async function requestSaveFileFromHost(file: {
  fileName: string
  mimeType: string
  dataBase64: string
}): Promise<SaveFileResponse | { status: 'unavailable'; reason: BridgeFailure }> {
  const outcome = await sendBridgeRequest({
    message: { type: 'pple:save-file-request', ...file },
    ackType: 'pple:save-file-ack',
    responseType: 'pple:save-file-response',
    parseResponse: (data) => SaveFileResponseSchema.safeParse(data).data ?? null,
    responseTimeoutMs: null,
    ackTimeoutMs: SAVE_FILE_ACK_TIMEOUT_MS,
  })

  if (!outcome.ok) {
    console.warn(`[PPLE Mini App] Save file: ${FAILURE_WARNINGS[outcome.failure]}`)
    return { status: 'unavailable', reason: outcome.failure }
  }

  return outcome.data
}
