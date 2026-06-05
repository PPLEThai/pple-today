import { z } from 'zod/v4'

const environmentSchema = z.object({
  EXPO_PUBLIC_APP_ENVIRONMENT: z
    .enum(['local', 'development', 'staging', 'production'])
    .default('local'),
  EXPO_PUBLIC_OIDC_BASE_URL: z.url(),
  EXPO_PUBLIC_OIDC_CLIENT_ID: z.string().min(1),
  EXPO_PUBLIC_BACKEND_BASE_URL: z.url(),
  EXPO_PUBLIC_ALLOWED_MINI_APP_ORIGIN_REDIRECT: z.url(),
  // Slug of the mini app whose token is used to switch the SSO AD active role.
  EXPO_PUBLIC_PPLE_ID_MINI_APP_SLUG: z.string().min(1).default('pple-id'),
})
// Might safeParse and log error instead
export const environment = environmentSchema.parse({
  EXPO_PUBLIC_APP_ENVIRONMENT: process.env.EXPO_PUBLIC_APP_ENVIRONMENT,
  EXPO_PUBLIC_OIDC_BASE_URL: process.env.EXPO_PUBLIC_OIDC_BASE_URL,
  EXPO_PUBLIC_OIDC_CLIENT_ID: process.env.EXPO_PUBLIC_OIDC_CLIENT_ID,
  EXPO_PUBLIC_BACKEND_BASE_URL: process.env.EXPO_PUBLIC_BACKEND_BASE_URL,
  EXPO_PUBLIC_ALLOWED_MINI_APP_ORIGIN_REDIRECT:
    process.env.EXPO_PUBLIC_ALLOWED_MINI_APP_ORIGIN_REDIRECT,
  EXPO_PUBLIC_PPLE_ID_MINI_APP_SLUG: process.env.EXPO_PUBLIC_PPLE_ID_MINI_APP_SLUG,
})
