import { Parse } from '@sinclair/typebox/value'
import jwt from 'jsonwebtoken'

import serverEnv from '../config/env'
import { IntrospectAccessTokenResult } from '../dtos/auth'

let jwtToken: string | null = null

export const generateJwtToken = (force: boolean = false) => {
  if (jwtToken && !force) {
    return jwtToken
  }

  const currentEpoch = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serverEnv.OIDC_CLIENT_ID,
    sub: serverEnv.OIDC_CLIENT_ID,
    aud: serverEnv.OIDC_URL,
    exp: currentEpoch + 60 * 60,
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
    console.error(`Error during introspection`)
    return null
  }

  const token_data = Parse(IntrospectAccessTokenResult, await response.json())
  if (!token_data.active) {
    console.error(`Token is not active: ${token_data.sub}`)
    return null
  }

  return token_data
}
