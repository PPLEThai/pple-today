import { z } from 'zod/v4'

const environmentSchema = z.object({
  APP_ENVIRONMENT: z.enum(['local', 'development', 'staging', 'production']).default('local'),
  EXPO_PUBLIC_OIDC_BASE_URL: z.url(),
  EXPO_PUBLIC_OIDC_CLIENT_ID: z.string().min(1),
  EXPO_PUBLIC_BACKEND_BASE_URL: z.url(),
  EXPO_PUBLIC_FACEBOOK_APP_ID: z.string(),
  EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN: z.string(),
})
// Might safeParse and log error instead
export const environment = environmentSchema.parse({
  APP_ENVIRONMENT: process.env.APP_ENVIRONMENT,
  EXPO_PUBLIC_OIDC_BASE_URL: process.env.EXPO_PUBLIC_OIDC_BASE_URL,
  EXPO_PUBLIC_OIDC_CLIENT_ID: process.env.EXPO_PUBLIC_OIDC_CLIENT_ID,
  EXPO_PUBLIC_BACKEND_BASE_URL: process.env.EXPO_PUBLIC_BACKEND_BASE_URL,
  EXPO_PUBLIC_FACEBOOK_APP_ID: process.env.EXPO_PUBLIC_FACEBOOK_APP_ID,
  EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN: process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN,
})
