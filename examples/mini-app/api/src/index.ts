import { cors } from '@elysiajs/cors'
import { node } from '@elysiajs/node'
import { Elysia } from 'elysia'

import { clientEnv } from './config/env'
import { introspectAccessToken } from './utils/jwt'

const app = new Elysia({ adapter: node() })
  .use(cors())
  .get('/', () => 'Hello Elysia')
  .get('/me', async ({ status, headers }) => {
    const token = headers['authorization']?.split(' ')[1]

    if (!token) {
      return status(401, { error: 'Unauthorized: No token provided' })
    }

    const userProfile = await introspectAccessToken(token ?? '', {
      oidcClientId: clientEnv.OIDC_CLIENT_ID,
      oidcUrl: clientEnv.OIDC_URL,
      oidcPrivateJwtKey: clientEnv.OIDC_PRIVATE_JWT_KEY,
      oidcKeyId: clientEnv.OIDC_KEY_ID,
    })

    if (userProfile.isErr()) {
      return status(500, { error: userProfile.error })
    }

    return status(200, userProfile.value)
  })
  .listen(2002, ({ hostname, port }) => {
    console.log(`🦊 Elysia is running at ${hostname}:${port}`)
  })
