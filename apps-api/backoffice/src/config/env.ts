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

  ENABLE_SWAGGER: t
    .Transform(
      t.Union([t.Literal('true'), t.Literal('false')], {
        default: 'false',
      })
    )
    .Decode((value) => value === 'true')
    .Encode((value) => (value ? 'true' : 'false')),
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

  FACEBOOK_API_URL: t.String({
    default: 'https://graph.facebook.com/v23.0',
    description: 'Base URL for Facebook Graph API',
  }),
  FACEBOOK_APP_ID: t.String({ description: 'Facebook App ID' }),
  FACEBOOK_APP_SECRET: t.String({ description: 'Facebook App Secret' }),

  GCP_PROJECT_ID: t.String({
    description: 'Google Cloud Project ID',
  }),
  GCP_CLIENT_EMAIL: t.String({
    description: 'Google Cloud Client Email',
  }),
  GCP_PRIVATE_KEY: t.String({
    description: 'Google Cloud Private Key',
  }),
  GCP_STORAGE_BUCKET_NAME: t.String({
    description: 'Google Cloud Storage Bucket Name',
  }),
})

const serverEnv = Value.Parse(envConfigSchema, process.env)

export default serverEnv
