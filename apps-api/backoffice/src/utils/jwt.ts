import { InternalErrorCode } from '@pple-today/api-common/dtos'
import { IntrospectAccessTokenResult } from '@pple-today/api-common/dtos'
import { err } from '@pple-today/api-common/utils'
import { Check } from '@sinclair/typebox/value'
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
      code: InternalErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An error occurred while introspecting the access token',
    })
  }

  const body = await response.json()

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
