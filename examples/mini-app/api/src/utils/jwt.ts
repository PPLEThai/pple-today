import { Check } from '@sinclair/typebox/value'
import { Static, t } from 'elysia'
import jwt from 'jsonwebtoken'
import { err, ok } from 'neverthrow'

const IntrospectAccessTokenResult = t.Union([
  t.Object({
    active: t.Literal(true, { description: 'Indicates if the token is active' }),
    scope: t.String({ description: 'Scopes associated with the token' }),
    client_id: t.String({ description: 'Client ID of the application' }),
    token_type: t.String({ description: 'Type of the token, e.g., Bearer' }),
    exp: t.Number({ description: 'Expiration time of the token in seconds since epoch' }),
    iat: t.Number({ description: 'Issued at time of the token in seconds since epoch' }),
    nbf: t.Number({ description: 'Not before time of the token in seconds since epoch' }),
    sub: t.String({ description: 'Subject identifier for the user' }),
    aud: t.Array(t.String(), { description: 'Audience for which the token is intended' }),
    iss: t.String({ description: 'Issuer of the token' }),
    jti: t.String({ description: 'JWT ID, a unique identifier for the token' }),
    username: t.String({ description: 'Username of the authenticated user' }),
    name: t.String({ description: 'Full name of the user' }),
    given_name: t.String({ description: 'Given name of the user' }),
    family_name: t.String({ description: 'Family name of the user' }),
    locale: t.Nullable(t.String({ description: 'Locale of the user, if available' })),
    updated_at: t.Number({ description: 'Last updated time of the user in seconds since epoch' }),
    preferred_username: t.String({ description: 'Preferred username of the user' }),
    email: t.Optional(t.String({ description: 'Email address of the user' })),
    email_verified: t.Optional(t.Boolean({ description: 'Indicates if the email is verified' })),
    phone_number: t.String({ description: 'Phone number of the user' }),
    phone_number_verified: t.Boolean({ description: 'Indicates if the phone number' }),
  }),
  t.Object({
    active: t.Literal(false, { description: 'Indicates if the token is active' }),
  }),
])

type IntrospectAccessTokenResult = Exclude<
  Static<typeof IntrospectAccessTokenResult>,
  { active: false }
>

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

export const introspectAccessToken = async (
  token: string,
  config: {
    oidcClientId: string
    oidcUrl: string
    oidcPrivateJwtKey: string
    oidcKeyId: string
  }
) => {
  const jwtToken = generateJwtToken(config)

  const httpHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' }
  const data = {
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: jwtToken,
    token: token,
  }

  const response = await fetch(`${config.oidcUrl}/oauth/v2/introspect`, {
    method: 'POST',
    headers: httpHeaders,
    body: new URLSearchParams(data),
  })

  if (!response.ok) {
    return err({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An error occurred while introspecting the access token',
    })
  }

  const body = await response.json()

  if (Check(IntrospectAccessTokenResult, body)) {
    if (!body.active) {
      return err({
        code: 'UNAUTHORIZED',
        message: 'Token is not active or has expired',
      })
    }

    return ok(body)
  }

  return err({
    code: 'BAD_REQUEST',
    message:
      'Invalid token format maybe oidc scope is missing (required scope ["openid", "profile", "phone"])',
  })
}
