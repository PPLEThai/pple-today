import { z } from 'zod/v4'

const environmentSchema = z.object({
  EXPO_PUBLIC_OIDC_BASE_URL: z.url(),
  EXPO_PUBLIC_OIDC_CLIENT_ID: z.string().min(1),
  EXPO_PUBLIC_BACKEND_BASE_URL: z.url(),
})
// Might safeParse and log error instead
export const environment = environmentSchema.parse({
  EXPO_PUBLIC_OIDC_BASE_URL: process.env.EXPO_PUBLIC_OIDC_BASE_URL,
  EXPO_PUBLIC_OIDC_CLIENT_ID: process.env.EXPO_PUBLIC_OIDC_CLIENT_ID,
  EXPO_PUBLIC_BACKEND_BASE_URL: process.env.EXPO_PUBLIC_BACKEND_BASE_URL,
})
