import { Value } from '@sinclair/typebox/value'
import { configDotenv } from 'dotenv'
import { t } from 'elysia'

configDotenv()

const envConfigSchema = t.Object({
  PORT: t.Number({ default: 5000 }),
  DATABASE_URL: t.String(),

  OIDC_URL: t.String({ description: 'OIDC URL for authentication' }),
  OIDC_KEY_ID: t.String({ description: 'Key ID for OIDC' }),
  OIDC_CLIENT_ID: t.String({ description: 'Client ID for OIDC' }),
  OIDC_PRIVATE_JWT_KEY: t.String({
    description: 'Private JWT key for OIDC',
  }),

  DEVELOPMENT_OIDC_URL: t.Optional(
    t.String({
      description: 'Development OIDC URL for testing purposes',
    })
  ),
  DEVELOPMENT_OIDC_CLIENT_ID: t.Optional(
    t.String({
      description: 'Development OIDC Client ID for testing purposes',
    })
  ),
})

const serverEnv = Value.Parse(envConfigSchema, process.env)

export default serverEnv
