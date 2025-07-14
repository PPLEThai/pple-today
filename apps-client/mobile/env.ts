import { z } from 'zod'

const environmentSchema = z.object({
  EXPO_PUBLIC_OIDC_BASE_URL: z.string().url(),
  EXPO_PUBLIC_OIDC_CLIENT_ID: z.string().min(1),
})
export const environment = environmentSchema.parse({
  EXPO_PUBLIC_OIDC_BASE_URL: process.env.EXPO_PUBLIC_OIDC_BASE_URL,
  EXPO_PUBLIC_OIDC_CLIENT_ID: process.env.EXPO_PUBLIC_OIDC_CLIENT_ID,
})
