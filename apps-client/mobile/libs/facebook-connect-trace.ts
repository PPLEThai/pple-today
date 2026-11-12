/**
 * The diagnostic trace of one "connect a Facebook page" attempt.
 *
 * Pure: no React Native imports, so it is unit-tested with vitest. The runtime
 * half (device context, sending, the active attempt) is in
 * `facebook-connect-attempt.ts`. The backend stores the trace via
 * `POST /facebook/connect-attempts`; see `docs/facebook-connect-diagnostics.md`.
 *
 * A trace must never hold a secret: no user or page access token, no auth
 * token. Step data goes through `sanitizeForTrace` and error text through
 * `redactSecrets`.
 */

/**
 * Uppercase letters and digits without the look-alikes 0/O and 1/I/L, so a
 * reference code read off a screenshot is unambiguous. The backend validates
 * attempt ids against the same alphabet.
 */
export const ATTEMPT_ID_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ATTEMPT_ID_LENGTH = 16
export const REFERENCE_CODE_LENGTH = 6

export const MAX_TRACE_STEPS = 50
/** Budget for the serialised steps; the backend rejects anything above 64 KB. */
export const MAX_TRACE_STEPS_JSON_LENGTH = 16 * 1024
const MAX_STRING_LENGTH = 500
const MAX_ARRAY_ITEMS = 20
const MAX_DEPTH = 4

export type ConnectAttemptOutcome = 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'ABANDONED'

export interface ConnectTraceStep {
  /** Milliseconds since the attempt started */
  at: number
  name: string
  data?: Record<string, unknown>
}

export interface ConnectTraceError {
  domain?: string
  code?: string
  message?: string
}

export interface ConnectTraceContext {
  platform: string
  osVersion?: string
  appVersion?: string
  buildNumber?: string
  deviceModel?: string
  facebookAppInstalled?: boolean | null
  trackingPermission?: string
}

export interface ConnectTracePayload {
  attemptId: string
  outcome: ConnectAttemptOutcome
  startedAt: string
  failedStep?: string
  error?: ConnectTraceError
  context: ConnectTraceContext
  steps: ConnectTraceStep[]
}

export function generateAttemptId(random: () => number = Math.random) {
  let id = ''
  for (let i = 0; i < ATTEMPT_ID_LENGTH; i++) {
    id += ATTEMPT_ID_ALPHABET[Math.floor(random() * ATTEMPT_ID_ALPHABET.length)]
  }
  return id
}

/** The short code shown in the error toast; support looks the attempt up by it. */
export function referenceCodeFromAttemptId(attemptId: string) {
  return attemptId.slice(0, REFERENCE_CODE_LENGTH)
}

/** Remove anything token-like from free text, such as an error message. */
export function redactSecrets(text: string) {
  return (
    text
      // Facebook user and page access tokens start with EAA
      .replace(/EAA[A-Za-z0-9_-]{10,}/g, '[REDACTED]')
      // access_token=..., "access_token":"...", accessToken: ...
      .replace(
        /((?:access_?token|client_secret|app_secret|secret|password)(?:\\?")?\s*[:=]\s*(?:\\?")?)[^"\\&\s,}]+/gi,
        '$1[REDACTED]'
      )
      .replace(/([?&](?:token|code)=)[^&\s"]+/gi, '$1[REDACTED]')
      .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[REDACTED]')
  )
}

/** Keys whose value is dropped from step data whatever it holds. */
const SECRET_KEY = /token|secret|password|authorization|cookie/i

/**
 * A JSON-safe, size-bounded, secret-free copy of `value` for step data: keys
 * like `access_token` are dropped, strings redacted and truncated, arrays and
 * nesting capped.
 */
export function sanitizeForTrace(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value ?? null
  if (typeof value === 'string') return truncate(redactSecrets(value), MAX_STRING_LENGTH)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value !== 'object') return String(value)
  if (depth >= MAX_DEPTH) return '[…]'
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeForTrace(item, depth + 1))
    if (value.length > MAX_ARRAY_ITEMS) items.push(`[+${value.length - MAX_ARRAY_ITEMS} more]`)
    return items
  }
  const result: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (SECRET_KEY.test(key) || item === undefined || typeof item === 'function') continue
    result[key] = sanitizeForTrace(item, depth + 1)
  }
  return result
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

/**
 * The fields the trace keeps from a thrown error. React Native's bridge drops
 * `NSError.code`, so a native Facebook SDK rejection carries only `message`,
 * `code` ("FacebookSDK"), `domain` and `userInfo`. A patched SDK puts the
 * native code in the message as `Login Failed: <domain> <code> <description>`,
 * which is parsed back out here.
 */
export function describeErrorForTrace(error: unknown): ConnectTraceError & {
  name?: string
  userInfo?: unknown
} {
  if (!error || typeof error !== 'object') {
    return { message: truncate(redactSecrets(String(error)), MAX_STRING_LENGTH) }
  }
  const native = error as {
    name?: unknown
    message?: unknown
    code?: unknown
    domain?: unknown
    userInfo?: unknown
  }
  const message = typeof native.message === 'string' ? native.message : undefined
  const nativeCode = message?.match(/^Login Failed: (\S+) (-?\d+)\b/)
  const domain = typeof native.domain === 'string' ? native.domain : nativeCode?.[1]
  const code =
    nativeCode?.[2] ??
    (native.code !== undefined && native.code !== null ? String(native.code) : undefined)
  return {
    name: typeof native.name === 'string' ? native.name : undefined,
    message: message !== undefined ? truncate(redactSecrets(message), 1000) : undefined,
    domain: domain !== undefined ? truncate(domain, 200) : undefined,
    code: code !== undefined ? truncate(code, 64) : undefined,
    userInfo:
      native.userInfo !== undefined && native.userInfo !== null
        ? sanitizeForTrace(native.userInfo)
        : undefined,
  }
}

/** The fields of a Graph API error body (`{ error: { ... } }`) worth keeping. */
export function describeGraphError(status: number, body: unknown) {
  const error =
    body && typeof body === 'object' && 'error' in body
      ? (body as { error?: Record<string, unknown> }).error
      : undefined
  return sanitizeForTrace({
    status,
    code: error?.code,
    subcode: error?.error_subcode,
    type: error?.type,
    message: error?.message,
    fbtraceId: error?.fbtrace_id,
    // No error object: keep a little of the body to see what came back instead
    body: error ? undefined : body,
  }) as Record<string, unknown>
}

/**
 * The fields of a backend error from the API client, which throws
 * `{ status, value: { error: { code, message } } }`.
 */
export function describeApiError(error: unknown): ConnectTraceError & { status?: number } {
  if (!error || typeof error !== 'object') return describeErrorForTrace(error)
  const { status, value } = error as { status?: unknown; value?: unknown }
  const body =
    value && typeof value === 'object' && 'error' in value
      ? (value as { error?: { code?: unknown; message?: unknown } }).error
      : undefined
  if (typeof status !== 'number' && !body) return describeErrorForTrace(error)
  return {
    status: typeof status === 'number' ? status : undefined,
    code: body?.code !== undefined ? truncate(String(body.code), 64) : undefined,
    message:
      typeof body?.message === 'string'
        ? truncate(redactSecrets(body.message), 1000)
        : typeof value === 'string'
          ? truncate(redactSecrets(value), 1000)
          : undefined,
  }
}

/**
 * Graph `/me/permissions` (`{ data: [{ permission, status }] }`) as lists of
 * granted, declined and expired permissions.
 */
export function summarizeGraphPermissions(body: unknown) {
  const rows =
    body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)
      ? ((body as { data: unknown[] }).data as { permission?: unknown; status?: unknown }[])
      : []
  const byStatus = (status: string) =>
    rows
      .filter((row) => row?.status === status && typeof row.permission === 'string')
      .map((row) => row.permission as string)
  return {
    granted: byStatus('granted'),
    declined: byStatus('declined'),
    expired: byStatus('expired'),
  }
}

export interface ConnectTrace {
  readonly attemptId: string
  readonly referenceCode: string
  record(name: string, data?: Record<string, unknown>): void
  toPayload(end: {
    outcome: ConnectAttemptOutcome
    context: ConnectTraceContext
    failedStep?: string
    error?: ConnectTraceError
  }): ConnectTracePayload
}

export function createConnectTrace(
  options: { attemptId?: string; now?: () => number } = {}
): ConnectTrace {
  const now = options.now ?? Date.now
  const attemptId = options.attemptId ?? generateAttemptId()
  const startedAt = now()
  const steps: ConnectTraceStep[] = []
  let droppedSteps = 0

  return {
    attemptId,
    referenceCode: referenceCodeFromAttemptId(attemptId),
    record(name, data) {
      // Keep the first steps, which explain how the attempt began, and leave
      // room for the last one.
      if (steps.length >= MAX_TRACE_STEPS - 1) {
        droppedSteps++
        return
      }
      steps.push({
        at: Math.max(0, Math.round(now() - startedAt)),
        name: truncate(name, 64),
        ...(data ? { data: sanitizeForTrace(data) as Record<string, unknown> } : {}),
      })
    },
    toPayload({ outcome, context, failedStep, error }) {
      const allSteps = droppedSteps
        ? [
            ...steps,
            { at: Math.round(now() - startedAt), name: 'steps_dropped', data: { droppedSteps } },
          ]
        : [...steps]
      return {
        attemptId,
        outcome,
        startedAt: new Date(startedAt).toISOString(),
        ...(failedStep ? { failedStep: truncate(failedStep, 64) } : {}),
        ...(error ? { error: boundError(error) } : {}),
        context: sanitizeForTrace(context) as ConnectTraceContext,
        steps: fitSteps(allSteps),
      }
    },
  }
}

function boundError(error: ConnectTraceError): ConnectTraceError {
  return {
    ...(error.domain ? { domain: truncate(redactSecrets(error.domain), 200) } : {}),
    ...(error.code ? { code: truncate(redactSecrets(error.code), 64) } : {}),
    ...(error.message ? { message: truncate(redactSecrets(error.message), 1000) } : {}),
  }
}

/** Drop step data, oldest first, until the steps fit the JSON budget. */
function fitSteps(steps: ConnectTraceStep[]) {
  const fitted = steps.map((step) => ({ ...step }))
  for (const step of fitted) {
    if (JSON.stringify(fitted).length <= MAX_TRACE_STEPS_JSON_LENGTH) break
    if (step.data) step.data = { truncated: true }
  }
  return fitted
}
