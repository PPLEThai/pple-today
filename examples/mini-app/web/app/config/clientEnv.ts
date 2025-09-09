import z from 'zod'

const CLIENT_ENV_SCHEMA = z.object({
  VITE_API_URL: z.string().url(),
})

const clientEnvResult = CLIENT_ENV_SCHEMA.safeParse({
  VITE_API_URL: import.meta.env.VITE_API_URL,
})

if (!clientEnvResult.success) {
  console.error('Invalid client environment variables:', clientEnvResult.error.format())
  throw new Error('Invalid client environment variables')
}

export const clientEnv = {
  API_URL: clientEnvResult.data.VITE_API_URL,
}
