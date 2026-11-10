import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Tray response token: `v1.<base64url({n,u,e,d,k})>.<base64url(HMAC-SHA256)>`.
 *
 * Authorises exactly one thing: answering notification `n` as user `u`, until
 * `e` (unix seconds), from the device whose FCM registration token hashes to
 * `d`. `k` is the id of the signing key, so a rotated secret can still verify
 * tokens already in flight. Stateless; single use is enforced by the unique
 * response row. See docs/interactive-notifications.md ("Credential: a response
 * token").
 */

const VERSION = 'v1'

export type ResponseTokenClaims = {
  notificationId: string
  userId: string
  /** Expiry, unix seconds. */
  exp: number
  /** `deviceHash` of the FCM registration token the push was sent to. */
  deviceHash: string
}

export type VerifyResponseTokenResult =
  | ({ ok: true } & ResponseTokenClaims)
  | { ok: false; reason: 'malformed' | 'signature' | 'expired' }

const b64url = (input: string | Buffer) => Buffer.from(input).toString('base64url')

/** `d` claim: base64url of the first 16 bytes of SHA-256 of an FCM registration token. */
export const deviceHash = (fcmToken: string) =>
  createHash('sha256').update(fcmToken).digest().subarray(0, 16).toString('base64url')

/** `k` claim: the first 8 hex chars of SHA-256 of the secret. */
export const responseTokenKeyId = (secret: string) =>
  createHash('sha256').update(secret).digest('hex').slice(0, 8)

const sign = (signingInput: string, secret: string) =>
  createHmac('sha256', secret).update(signingInput).digest()

export function mintResponseToken(claims: ResponseTokenClaims, secret: string): string {
  const payload = b64url(
    JSON.stringify({
      n: claims.notificationId,
      u: claims.userId,
      e: claims.exp,
      d: claims.deviceHash,
      k: responseTokenKeyId(secret),
    })
  )
  const signingInput = `${VERSION}.${payload}`
  return `${signingInput}.${b64url(sign(signingInput, secret))}`
}

/**
 * Verifies against the secret whose key id the token names. `secrets` is the
 * current secret followed by the previous one, if any; a token naming neither
 * is a bad signature.
 */
export function verifyResponseToken(
  token: string,
  secrets: string[],
  now: Date
): VerifyResponseTokenResult {
  const parts = typeof token === 'string' ? token.split('.') : []
  if (parts.length !== 3 || parts[0] !== VERSION || !parts[1] || !parts[2]) {
    return { ok: false, reason: 'malformed' }
  }
  const [, payload, signature] = parts

  let claims: unknown
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (typeof claims !== 'object' || claims === null) return { ok: false, reason: 'malformed' }
  const c = claims as Record<string, unknown>
  if (
    typeof c.n !== 'string' ||
    typeof c.u !== 'string' ||
    typeof c.e !== 'number' ||
    !Number.isFinite(c.e) ||
    typeof c.d !== 'string' ||
    typeof c.k !== 'string'
  ) {
    return { ok: false, reason: 'malformed' }
  }

  // The kid only selects a key; the signature is what proves anything.
  const secret = secrets.find((s) => responseTokenKeyId(s) === c.k)
  if (secret === undefined) return { ok: false, reason: 'signature' }
  const expected = sign(`${VERSION}.${payload}`, secret)
  const actual = Buffer.from(signature, 'base64url')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return { ok: false, reason: 'signature' }
  }

  if (Math.floor(now.getTime() / 1000) >= c.e) return { ok: false, reason: 'expired' }
  return { ok: true, notificationId: c.n, userId: c.u, exp: c.e, deviceHash: c.d }
}
