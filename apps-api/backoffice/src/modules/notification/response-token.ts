import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Tray response token: `v1.<base64url({n,u,e})>.<base64url(HMAC-SHA256)>`.
 *
 * Authorises exactly one thing: answering notification `n` as user `u`, until
 * `e` (unix seconds). Stateless; single use is enforced by the unique response
 * row. See docs/interactive-notifications.md ("Credential: a response token").
 */

const VERSION = 'v1'

export type ResponseTokenClaims = {
  notificationId: string
  userId: string
  /** Expiry, unix seconds. */
  exp: number
}

export type VerifyResponseTokenResult =
  | ({ ok: true } & ResponseTokenClaims)
  | { ok: false; reason: 'malformed' | 'signature' | 'expired' }

const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url')

const sign = (signingInput: string, secret: string) =>
  createHmac('sha256', secret).update(signingInput).digest()

export function mintResponseToken(claims: ResponseTokenClaims, secret: string): string {
  const payload = b64url(
    JSON.stringify({ n: claims.notificationId, u: claims.userId, e: claims.exp })
  )
  const signingInput = `${VERSION}.${payload}`
  return `${signingInput}.${b64url(sign(signingInput, secret))}`
}

export function verifyResponseToken(
  token: string,
  secret: string,
  now: Date
): VerifyResponseTokenResult {
  const parts = typeof token === 'string' ? token.split('.') : []
  if (parts.length !== 3 || parts[0] !== VERSION || !parts[1] || !parts[2]) {
    return { ok: false, reason: 'malformed' }
  }
  const [, payload, signature] = parts

  const expected = sign(`${VERSION}.${payload}`, secret)
  const actual = Buffer.from(signature, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return { ok: false, reason: 'signature' }
  }

  let claims: unknown
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (
    typeof claims !== 'object' ||
    claims === null ||
    typeof (claims as { n?: unknown }).n !== 'string' ||
    typeof (claims as { u?: unknown }).u !== 'string' ||
    typeof (claims as { e?: unknown }).e !== 'number' ||
    !Number.isFinite((claims as { e: number }).e)
  ) {
    return { ok: false, reason: 'malformed' }
  }
  const { n, u, e } = claims as { n: string; u: string; e: number }

  if (Math.floor(now.getTime() / 1000) >= e) return { ok: false, reason: 'expired' }
  return { ok: true, notificationId: n, userId: u, exp: e }
}
