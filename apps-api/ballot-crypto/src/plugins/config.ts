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
})

export const ConfigServicePlugin = createConfigServicePlugin({
  autoLoadEnv: true,
  schema: envSchema,
})
