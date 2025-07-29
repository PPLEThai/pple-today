import z from 'zod'

const CLIENT_ENV_SCHEMA = z.object({
  VITE_OIDC_AUTHORITY_URL: z.string().url(),
  VITE_OIDC_CLIENT_ID: z.string().nonempty(),
  VITE_OIDC_REDIRECT_URL: z.string().url(),
  VITE_OIDC_ADDITIONAL_SCOPE: z.string().optional().default(''),

  VITE_FACEBOOK_APP_ID: z.string().nonempty(),
  VITE_FACEBOOK_REDIRECT_URL: z.string().url(),

  VITE_API_URL: z.string().url(),
})

const clientEnvResult = CLIENT_ENV_SCHEMA.safeParse({
  VITE_OIDC_AUTHORITY_URL: import.meta.env.VITE_OIDC_AUTHORITY_URL,
  VITE_OIDC_CLIENT_ID: import.meta.env.VITE_OIDC_CLIENT_ID,
  VITE_OIDC_REDIRECT_URL: import.meta.env.VITE_OIDC_REDIRECT_URL,
  VITE_OIDC_ADDITIONAL_SCOPE: import.meta.env.VITE_OIDC_ADDITIONAL_SCOPE,

  VITE_FACEBOOK_APP_ID: import.meta.env.VITE_FACEBOOK_APP_ID,
  VITE_FACEBOOK_REDIRECT_URL: import.meta.env.VITE_FACEBOOK_REDIRECT_URL,

  VITE_API_URL: import.meta.env.VITE_API_URL,
})

if (!clientEnvResult.success) {
  console.error('Invalid client environment variables:', clientEnvResult.error.format())
  throw new Error('Invalid client environment variables')
}

export const clientEnv = {
  OIDC_AUTHORITY_URL: clientEnvResult.data.VITE_OIDC_AUTHORITY_URL,
  OIDC_ADDITIONAL_SCOPE: clientEnvResult.data.VITE_OIDC_ADDITIONAL_SCOPE,
  OIDC_CLIENT_ID: clientEnvResult.data.VITE_OIDC_CLIENT_ID,
  OIDC_REDIRECT_URL: clientEnvResult.data.VITE_OIDC_REDIRECT_URL,
  FACEBOOK_APP_ID: clientEnvResult.data.VITE_FACEBOOK_APP_ID,
  FACEBOOK_REDIRECT_URL: clientEnvResult.data.VITE_FACEBOOK_REDIRECT_URL,
  API_URL: clientEnvResult.data.VITE_API_URL,
}
