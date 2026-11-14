import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { IntrospectAccessTokenResult } from '@pple-today/api-common/dtos'
import { err } from '@pple-today/api-common/utils'
import { Check } from '@sinclair/typebox/value'
import { createHash } from 'crypto'
import jwt from 'jsonwebtoken'
import { ok } from 'neverthrow'

let jwtToken: string | null = null
let latestJwtGenerationTime: number | null = null

const JWT_TOKEN_EXPIRATION_TIME = 60 * 60 // 1 hour

export const generateJwtToken = (
  config: {
    oidcClientId: string
    oidcUrl: string
    oidcPrivateJwtKey: string
    oidcKeyId: string
  },
  force: boolean = false
) => {
  const currentEpoch = Math.floor(Date.now() / 1000)
  if (
    jwtToken &&
    !force &&
    latestJwtGenerationTime &&
    currentEpoch - latestJwtGenerationTime < JWT_TOKEN_EXPIRATION_TIME
  ) {
    return jwtToken
  }

  const payload = {
    iss: config.oidcClientId,
    sub: config.oidcClientId,
    aud: config.oidcUrl,
    exp: currentEpoch + JWT_TOKEN_EXPIRATION_TIME,
    iat: currentEpoch,
  }

  const headers = {
    alg: 'RS256',
    kid: config.oidcKeyId,
  }

  jwtToken = jwt.sign(payload, config.oidcPrivateJwtKey, {
    algorithm: 'RS256',
    header: headers,
  })
  latestJwtGenerationTime = currentEpoch

  return jwtToken
}

/**
 * How long one SSO call may take before the request fails instead of waiting.
 * Introspection normally answers in under 100 ms. Without a bound, a slow SSO
 * holds every authenticated request open, and with it a database connection.
 */
export const SSO_REQUEST_TIMEOUT_MS = 3000

/**
 * How long an introspection answer is reused for the same token.
 *
 * The app fires many authenticated requests in parallel on every screen, and
 * each one used to introspect on its own, so one user cost the SSO a dozen
 * calls a minute. A short window removes that fan-out while bounding the two
 * things a cached answer delays: a revoked token keeps working on this pod for
 * at most this long, and a role change in `pple_roles` shows up at most this
 * late. The SSO applies pending role syncs when it introspects, so those are
 * delayed by the same window.
 *
 * AD visible roles (`fetchAdVisibleRoles`) are deliberately not cached here:
 * they decide access right after a role switch.
 */
export const INTROSPECTION_CACHE_TTL_MS = 20 * 1000

/** Upper bound on cached tokens per pod, so memory stays flat under a surge. */
const INTROSPECTION_CACHE_MAX_ENTRIES = 10_000

type OidcConfig = {
  oidcClientId: string
  oidcUrl: string
  oidcPrivateJwtKey: string
  oidcKeyId: string
}

type IntrospectionResult = Awaited<ReturnType<typeof requestIntrospection>>

const introspectionCache = new Map<string, { expiresAt: number; result: IntrospectionResult }>()
const introspectionsInFlight = new Map<string, Promise<IntrospectionResult>>()

const cacheKeyFor = (token: string) => createHash('sha256').update(token).digest('hex')

/** Only answers that cannot change before the TTL runs out are kept. */
const cacheExpiryFor = (result: IntrospectionResult, now: number): number | null => {
  if (result.isOk()) {
    // Never outlive the token itself.
    return Math.min(now + INTROSPECTION_CACHE_TTL_MS, result.value.exp * 1000)
  }

  // An inactive token never becomes active again, so caching the rejection is
  // safe and spares the SSO from clients that keep sending an expired token.
  // Errors on our side (timeouts, 5xx, unexpected bodies) are retried.
  if (result.error.code === InternalErrorCode.UNAUTHORIZED) {
    return now + INTROSPECTION_CACHE_TTL_MS
  }

  return null
}

const rememberIntrospection = (key: string, result: IntrospectionResult) => {
  const now = Date.now()
  const expiresAt = cacheExpiryFor(result, now)
  if (expiresAt === null || expiresAt <= now) return

  if (introspectionCache.size >= INTROSPECTION_CACHE_MAX_ENTRIES) {
    // Maps iterate in insertion order, so the first key is the oldest entry.
    const oldestKey = introspectionCache.keys().next().value
    if (oldestKey !== undefined) introspectionCache.delete(oldestKey)
  }

  introspectionCache.set(key, { expiresAt, result })
}

/** Test-only: forget every cached and in-flight introspection. */
export const resetIntrospectionCache = () => {
  introspectionCache.clear()
  introspectionsInFlight.clear()
}

/**
 * Introspect an access token, reusing a recent answer for the same token and
 * sharing one SSO call between concurrent requests that carry it.
 */
export const introspectAccessToken = async (token: string, config: OidcConfig) => {
  const key = cacheKeyFor(token)

  const cached = introspectionCache.get(key)
  if (cached) {
    if (cached.expiresAt > Date.now()) return cached.result
    introspectionCache.delete(key)
  }

  const inFlight = introspectionsInFlight.get(key)
  if (inFlight) return await inFlight

  const request = requestIntrospection(token, config)
    .then((result) => {
      rememberIntrospection(key, result)
      return result
    })
    .finally(() => {
      introspectionsInFlight.delete(key)
    })

  introspectionsInFlight.set(key, request)

  return await request
}

const requestIntrospection = async (token: string, config: OidcConfig) => {
  const jwtToken = generateJwtToken(config)

  const httpHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' }
  const data = {
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: jwtToken,
    token: token,
  }

  let response: Response
  try {
    response = await fetch(`${config.oidcUrl}/oauth/v2/introspect`, {
      method: 'POST',
      headers: httpHeaders,
      body: new URLSearchParams(data),
      signal: AbortSignal.timeout(SSO_REQUEST_TIMEOUT_MS),
    })
  } catch {
    // Timeout or network failure: same answer as an SSO error response.
    return err({
      code: InternalErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An error occurred while introspecting the access token',
    })
  }

  if (!response.ok) {
    return err({
      code: InternalErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An error occurred while introspecting the access token',
    })
  }

  // A struggling SSO can answer 200 with an HTML error page, so the body is not
  // trusted to be JSON.
  const body = await response.json().catch(() => null)

  if (Check(IntrospectAccessTokenResult, body)) {
    if (!body.active) {
      return err({
        code: InternalErrorCode.UNAUTHORIZED,
        message: 'Token is not active or has expired',
      })
    }

    return ok(body)
  }

  return err({
    code: InternalErrorCode.BAD_REQUEST,
    message:
      'Invalid token format maybe oidc scope is missing (required scope ["openid", "profile", "phone"])',
  })
}
