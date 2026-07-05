import { createConfigServicePlugin } from '@pple-today/api-common/plugins'
import { t } from 'elysia'

export const envSchema = t.Object({
  PORT: t.Number({ default: 5000 }),
  MINIAPP_REDIRECT_PORT: t.Number({
    default: 2002,
    description: 'Port for the mini app redirect server',
  }),
  MINIAPP_IOS_TEAM_ID: t.Optional(
    t.String({
      description: 'Apple Developer Team ID for Universal Links (AASA appID prefix)',
    })
  ),
  MINIAPP_IOS_BUNDLE_ID: t.Optional(
    t.String({
      description: 'iOS bundle identifier (must match PPLE Today app DEVELOPER_APP_IDENTIFIER)',
    })
  ),
  MINIAPP_ANDROID_PACKAGE_NAME: t.Optional(
    t.String({
      description: 'Android application ID for App Links (assetlinks.json)',
    })
  ),
  MINIAPP_ANDROID_SHA256_CERT_FINGERPRINTS: t.Optional(
    t.String({
      description:
        'Comma-separated SHA-256 cert fingerprints for App Links verification (upload + Play signing certs)',
    })
  ),
  DATABASE_URL: t.String(),
  APP_ENV: t.Union([t.Literal('development'), t.Literal('production')], {
    default: 'production',
  }),

  API_BASE_URL: t.String({
    description: 'Base URL for backoffice API',
  }),

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
  ZITADEL_API_URL: t.Optional(
    t.String({
      description: 'Base URL of the Zitadel instance for Management API calls',
    })
  ),
  ZITADEL_PAT: t.Optional(
    t.String({
      description: 'Personal access token of the Zitadel machine user used for the Management API',
    })
  ),
  ZITADEL_PROJECT_ID: t.Optional(
    t.String({
      description: 'Zitadel project ID ("PPLE Mini App") where OIDC apps are created',
    })
  ),
  ZITADEL_ORG_ID: t.Optional(
    t.String({
      description: 'Zitadel organization ID (sent as x-zitadel-orgid header)',
    })
  ),
  ZITADEL_LOGIN_V2_BASE_URI: t.String({
    default: 'https://id.peoplesparty.or.th/',
    description: 'Base URI of the new Login UI (Login V2) applied to created OIDC apps',
  }),
  DEFAULT_MINI_APP_CLIENT_ID: t.Optional(
    t.String({
      description: 'Fallback OIDC client ID for mini apps that do not require authentication',
    })
  ),
  AD_ROLE_OPTIONS_URL: t.String({
    default: 'https://id.peoplesparty.or.th/api/internal/config/extra_roles',
    description:
      'URL returning the SSO AD extra-role options ([{label, value}]); called with the internal SSO bearer token (SSO_INTERNAL_TOKEN)',
  }),
  SSO_INTERNAL_TOKEN: t.Optional(
    t.String({
      description:
        'Internal bearer token used to call the SSO internal APIs (e.g. AD role options)',
    })
  ),

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
  FACEBOOK_WEBHOOK_VERIFY_TOKEN: t.String({
    description: 'Token used to verify Facebook webhook requests',
  }),

  GCP_PROJECT_ID: t.Optional(
    t.String({
      description: 'Google Cloud Project ID',
    })
  ),
  GCP_CLIENT_EMAIL: t.Optional(
    t.String({
      description: 'Google Cloud Client Email',
    })
  ),
  GCP_PRIVATE_KEY: t.Optional(
    t.String({
      description: 'Google Cloud Private Key',
    })
  ),
  GCP_STORAGE_BUCKET_NAME: t.String({
    description: 'Google Cloud Storage Bucket Name',
  }),

  BALLOT_CRYPTO_DOMAIN: t.String({
    description: 'Domain of ballot crypto service',
  }),
  BALLOT_CRYPTO_TO_BACKOFFICE_KEY: t.String({
    description: 'API key for authenticate ballot crypto',
  }),
  BACKOFFICE_TO_BALLOT_CRYPTO_KEY: t.String({
    description: 'API key for authenticate backoffice',
  }),

  FIREBASE_PROJECT_ID: t.String({
    description: 'Firebase Project Id',
  }),
  FIREBASE_CLIENT_EMAIL: t.String({
    description: 'Firebase Client Email',
  }),
  FIREBASE_PRIVATE_KEY: t.String({
    description: 'Firebase Private Key',
  }),

  SMS_SERVICE_BASE_URL: t.Optional(
    t.String({
      description: 'Base URL for SMS service provider',
    })
  ),
  SMS_SERVICE_API_KEY: t.Optional(
    t.String({
      description: 'API key for SMS service provider',
    })
  ),
  SMS_SERVICE_SECRET_KEY: t.Optional(
    t.String({
      description: 'Secret key for SMS service provider',
    })
  ),
  SMS_SERVICE_SENDER_NAME: t.Optional(
    t.String({
      description: 'Sender name displayed in outbound SMS messages',
    })
  ),

  IMAGE_SERVER_BASE_URL: t.String({
    description: 'Base URL for image server',
  }),
  PPLE_ACTIVITY_BASE_URL: t.String({
    description: 'Base URL for PPLE Activity API',
    format: 'uri',
  }),
  PPLE_ACTIVITY_CACHE_TIME: t.Optional(
    t.Number({
      description: 'Cache time for PPLE Activity API responses in seconds',
    })
  ),
})

export const ConfigServicePlugin = createConfigServicePlugin({
  autoLoadEnv: true,
  schema: envSchema,
})
