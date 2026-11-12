import type { Prisma } from '@pple-today/database/prisma'

import type { CreateFacebookConnectAttemptBody } from './models'

/**
 * Diagnostics for the mobile app's "connect a Facebook page" flow.
 *
 * The app records one trace per attempt and posts it to
 * `POST /facebook/connect-attempts` when the attempt ends. Support finds the row
 * by the reference code shown in the app's error toast, or by user. See
 * `docs/facebook-connect-diagnostics.md`.
 */

/**
 * Characters an attempt id is made of: uppercase letters and digits without the
 * look-alikes 0/O, 1/I/L, so a code read off a screenshot is unambiguous. The
 * mobile app's `libs/facebook-connect-trace.ts` uses the same alphabet.
 */
export const CONNECT_ATTEMPT_ID_PATTERN = '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{16}$'
export const REFERENCE_CODE_LENGTH = 6

/** Attempts are deleted after this long. */
export const CONNECT_ATTEMPT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000
/** How often one API process runs the retention delete. */
export const CONNECT_ATTEMPT_PURGE_INTERVAL_MS = 60 * 60 * 1000
/**
 * Upper bound on the stored `steps` + `context` JSON. The app keeps its trace
 * far below this; anything bigger is not a trace from the app.
 */
export const MAX_CONNECT_ATTEMPT_JSON_LENGTH = 64 * 1024

/** The short code the app shows the user: the first characters of the attempt id. */
export function referenceCodeFromAttemptId(attemptId: string) {
  return attemptId.slice(0, REFERENCE_CODE_LENGTH)
}

/**
 * Strip anything token-like from text the app sent. The app already redacts,
 * this is a second line of defence so a client bug can never put a Facebook
 * token into the database or the logs.
 */
export function redactSecrets(text: string) {
  return (
    text
      // Facebook user and page access tokens start with EAA
      .replace(/EAA[A-Za-z0-9_-]{10,}/g, '[REDACTED]')
      // access_token=..., "access_token":"...", accessToken: ..., also inside
      // JSON that was itself serialised into a string (\"access_token\":\"...\")
      .replace(
        /((?:access_?token|client_secret|app_secret|secret|password)(?:\\?")?\s*[:=]\s*(?:\\?")?)[^"\\&\s,}]+/gi,
        '$1[REDACTED]'
      )
      .replace(/([?&](?:token|code)=)[^&\s"]+/gi, '$1[REDACTED]')
      .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1[REDACTED]')
  )
}

/** Deep-redact a JSON value by redacting its serialised form. */
export function redactJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(redactSecrets(JSON.stringify(value ?? null)))
}

/** Map a request body to the row to store, with every free-text field redacted. */
export function toConnectAttemptRecord(userId: string, body: CreateFacebookConnectAttemptBody) {
  const { context, error } = body
  const { platform, osVersion, appVersion, buildNumber, ...otherContext } = context
  return {
    id: body.attemptId,
    referenceCode: referenceCodeFromAttemptId(body.attemptId),
    userId,
    outcome: body.outcome,
    failedStep: body.failedStep ?? null,
    platform,
    osVersion: osVersion ?? null,
    appVersion: appVersion ?? null,
    buildNumber: buildNumber ?? null,
    errorDomain: error?.domain ? redactSecrets(error.domain) : null,
    errorCode: error?.code ? redactSecrets(error.code) : null,
    errorMessage: error?.message ? redactSecrets(error.message) : null,
    context: redactJson(otherContext),
    steps: redactJson(body.steps),
    startedAt: new Date(body.startedAt),
  }
}

export type ConnectAttemptRecord = ReturnType<typeof toConnectAttemptRecord>

/** Whether the parts stored as JSON fit `MAX_CONNECT_ATTEMPT_JSON_LENGTH`. */
export function isConnectAttemptWithinSizeLimit(body: CreateFacebookConnectAttemptBody) {
  return (
    JSON.stringify(body.steps).length + JSON.stringify(body.context).length <=
    MAX_CONNECT_ATTEMPT_JSON_LENGTH
  )
}
