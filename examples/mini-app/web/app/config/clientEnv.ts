import z from 'zod'

const CLIENT_ENV_SCHEMA = z.object({
  VITE_API_URL: z.string().url(),
  VITE_OAUTH_CLIENT_ID: z.string(),
  VITE_OAUTH_REDIRECT_URI: z.string().url(),
})

const clientEnvResult = CLIENT_ENV_SCHEMA.safeParse({
  VITE_API_URL: import.meta.env.VITE_API_URL,
  VITE_OAUTH_CLIENT_ID: import.meta.env.VITE_OAUTH_CLIENT_ID,
  VITE_OAUTH_REDIRECT_URI: import.meta.env.VITE_OAUTH_REDIRECT_URI,
})

if (!clientEnvResult.success) {
  console.error('Invalid client environment variables:', clientEnvResult.error.format())
  throw new Error('Invalid client environment variables')
}

export const clientEnv = {
  API_URL: clientEnvResult.data.VITE_API_URL,
  OAUTH_CLIENT_ID: clientEnvResult.data.VITE_OAUTH_CLIENT_ID,
  OAUTH_REDIRECT_URI: clientEnvResult.data.VITE_OAUTH_REDIRECT_URI,
}
