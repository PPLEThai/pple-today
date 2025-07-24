import { Check } from '@sinclair/typebox/value'
import jwt from 'jsonwebtoken'

import serverEnv from '../config/env'
import { IntrospectAccessTokenResult } from '../dtos/auth'
import { InternalErrorCode } from '../dtos/error'

let jwtToken: string | null = null
let latestJwtGenerationTime: number | null = null

const JWT_TOKEN_EXPIRATION_TIME = 60 * 60 // 1 hour

export const generateJwtToken = (force: boolean = false) => {
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
    iss: serverEnv.OIDC_CLIENT_ID,
    sub: serverEnv.OIDC_CLIENT_ID,
    aud: serverEnv.OIDC_URL,
    exp: currentEpoch + JWT_TOKEN_EXPIRATION_TIME,
    iat: currentEpoch,
  }

  const headers = {
    alg: 'RS256',
    kid: serverEnv.OIDC_KEY_ID,
  }

  jwtToken = jwt.sign(payload, serverEnv.OIDC_PRIVATE_JWT_KEY, {
    algorithm: 'RS256',
    header: headers,
  })
  latestJwtGenerationTime = currentEpoch

  return jwtToken
}

export const introspectAccessToken = async (token: string) => {
  const jwtToken = generateJwtToken()

  const httpHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' }
  const data = {
    client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    client_assertion: jwtToken,
    token: token,
  }
  const response = await fetch(`${serverEnv.OIDC_URL}/oauth/v2/introspect`, {
    method: 'POST',
    headers: httpHeaders,
    body: new URLSearchParams(data),
  })

  if (!response.ok) {
    return {
      error: {
        code: InternalErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An error occurred while introspecting the access token',
      },
    }
  }

  const body = await response.json()

  if (Check(IntrospectAccessTokenResult, body)) {
    if (!body.active) {
      return {
        error: {
          code: InternalErrorCode.UNAUTHORIZED,
          message: 'Token is not active or has expired',
        },
      }
    }

    return body
  }

  return {
    error: {
      code: InternalErrorCode.BAD_REQUEST,
      message:
        'Invalid token format maybe oidc scope is missing (required scope ["openid", "profile", "phone"])',
    },
  }
}
