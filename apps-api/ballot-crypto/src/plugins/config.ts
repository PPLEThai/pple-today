import { createConfigServicePlugin } from '@pple-today/api-common/plugins'
import { t } from 'elysia'

export const envSchema = t.Object({
  PORT: t.Number({ default: 5000 }),
  APP_ENV: t.Union([t.Literal('development'), t.Literal('production')], {
    default: 'production',
  }),

  ENABLE_SWAGGER: t
    .Transform(
      t.Union([t.Literal('true'), t.Literal('false')], {
        default: 'false',
      })
    )
    .Decode((value) => value === 'true')
    .Encode((value) => (value ? 'true' : 'false')),

  GCP_PROJECT_ID: t.String({
    description: 'Google Cloud Project ID',
  }),
  GCP_CLIENT_EMAIL: t.String({
    description: 'Google Cloud Client Email',
  }),
  GCP_PRIVATE_KEY: t.String({
    description: 'Google Cloud Private Key',
  }),
  GCP_LOCATION: t.String({
    description: 'Google Cloud Location',
  }),
  GCP_ENCRYPTION_KEY_RING: t.String({
    description: 'Google Cloud Encryption Key Ring',
  }),
  GCP_SIGNING_KEY_RING: t.String({
    description: 'Google Cloud Signing Key Ring',
  }),

  BACKOFFICE_DOMAIN: t.String({
    description: 'Domain of ballot crypto service',
  }),
  BALLOT_CRYPTO_TO_BACKOFFICE_KEY: t.String({
    description: 'API key for authenticate ballot crypto',
  }),
  BACKOFFICE_TO_BALLOT_CRYPTO_KEY: t.String({
    description: 'API key for authenticate backoffice',
  }),
})

export const ConfigServicePlugin = createConfigServicePlugin({
  autoLoadEnv: true,
  schema: envSchema,
})
