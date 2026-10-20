import {
  BridgeResponseSchema,
  BridgeSession,
  RoleSwitchResponse,
  RoleSwitchResponseSchema,
} from './models'

// See BRIDGE.md for the protocol.

const MINI_APP_USER_AGENT = /PPLETodayApp\/(\d.\d.\d) MiniApp/
const ACK_TIMEOUT_MS = 3_000
// The host may be showing the user a role prompt before it answers.
const RESPONSE_TIMEOUT_MS = 120_000

// Declared locally rather than globally so the published typings do not
// leak a `window.ReactNativeWebView` into every consumer.
type ReactNativeWebViewWindow = Window & {
  ReactNativeWebView?: { postMessage?: (message: string) => void }
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
}): Promise<BridgeOutcome<T>> {
  const { message, ackType, responseType, parseResponse, responseTimeoutMs } = options

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
    const ackTimer = setTimeout(() => finish({ ok: false, failure: 'no-ack' }), ACK_TIMEOUT_MS)

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
