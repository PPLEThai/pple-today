import { Parse } from '@sinclair/typebox/value'
import * as dotenv from 'dotenv'
import { t } from 'elysia'

dotenv.config()

export const envSchema = t.Object({
  OIDC_URL: t.String({ description: 'OIDC URL for authentication' }),
  OIDC_KEY_ID: t.String({ description: 'Key ID for OIDC' }),
  OIDC_CLIENT_ID: t.String({ description: 'Client ID for OIDC' }),
  OIDC_PRIVATE_JWT_KEY: t.String({
    description: 'Private JWT key for OIDC',
  }),
})

export const clientEnv = Parse(envSchema, process.env)
