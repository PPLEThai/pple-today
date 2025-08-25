import { getItemAsync, setItemAsync } from 'expo-secure-store'
import { z } from 'zod/v4'

export const AUTH_SESSION_STORAGE_KEY = 'authSession'

export const AuthSessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  idToken: z.nullable(z.string()),
})
export type AuthSession = z.output<typeof AuthSessionSchema>

export function parseAuthSession(json: string | null): AuthSession | null {
  if (json === null) return null
  const data = JSON.parse(json)
  if (data === null) return null
  const result = AuthSessionSchema.safeParse(data)
  if (result.error) {
    console.error('Error parsing auth session:', result.error, json)
    return null
  }
  return result.data
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const session = await getItemAsync(AUTH_SESSION_STORAGE_KEY)
  return parseAuthSession(session)
}

export async function setAuthSession(session: AuthSession | null) {
  return setItemAsync(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session))
}
