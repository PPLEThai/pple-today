import { Platform } from 'react-native'
import { createMutation, createQuery } from 'react-query-kit'

import { useQueryClient } from '@tanstack/react-query'
import {
  AuthRequest,
  AuthSessionResult,
  CodeChallengeMethod,
  DiscoveryDocument,
  exchangeCodeAsync,
  fetchDiscoveryAsync,
  fetchUserInfoAsync,
  makeRedirectUri,
  ResponseType,
} from 'expo-auth-session'
import { getItemAsync, setItemAsync } from 'expo-secure-store'
import * as WebBrowser from 'expo-web-browser'
import { z } from 'zod/v4'

import appConfig from '@app/app.config'
import { environment } from '@app/env'

import { queryClient } from './react-query'

const authRequest: AuthRequest = new AuthRequest({
  responseType: ResponseType.Code,
  clientId: environment.EXPO_PUBLIC_OIDC_CLIENT_ID,
  usePKCE: true,
  scopes: ['openid', 'profile', 'phone'],
  codeChallengeMethod: CodeChallengeMethod.S256,
  redirectUri: makeRedirectUri({
    native: `${appConfig.expo.scheme}:/`,
  }),
})

const AUTH_SESSION_STORAGE_KEY = 'authSession'

const AuthSessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  idToken: z.nullable(z.string()),
})
export type AuthSession = z.output<typeof AuthSessionSchema>
function parseAuthSession(json: string | null): AuthSession | null {
  if (json === null) return null
  const data = JSON.parse(json)
  const result = AuthSessionSchema.safeParse(data)
  if (result.error) return null
  return result.data
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const session = await getItemAsync(AUTH_SESSION_STORAGE_KEY)
  return parseAuthSession(session)
}

export const useDiscoveryQuery = createQuery({
  queryKey: ['discovery'],
  fetcher: () => {
    return fetchDiscoveryAsync(environment.EXPO_PUBLIC_OIDC_BASE_URL)
  },
})

export const useSessionQuery = createQuery({
  queryKey: ['session'],
  fetcher: async () => {
    const session = await getItemAsync(AUTH_SESSION_STORAGE_KEY)
    return parseAuthSession(session)
  },
})

const useSetSessionMutation = createMutation({
  mutationKey: ['session'],
  mutationFn: (session: AuthSession | null) => {
    return setItemAsync(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session))
  },
})
export const useSessionMutation = () => {
  const queryClient = useQueryClient()
  const sessionQuery = useSessionQuery()
  const userQuery = useUserQuery()
  return useSetSessionMutation({
    onMutate: (session) => {
      // Optimistically update the session query cache
      queryClient.setQueryData(useSessionQuery.getKey(), session)
      if (!session) {
        queryClient.setQueryData(useUserQuery.getKey(), null)
      }
    },
    onSuccess: () => {
      sessionQuery.refetch()
      userQuery.refetch()
    },
  })
}

export const useUserQuery = createQuery({
  queryKey: ['user'],
  fetcher: (variables: { session: AuthSession; discovery: DiscoveryDocument }) => {
    return fetchUserInfoAsync({ accessToken: variables.session.accessToken }, variables.discovery)
  },
  initialData: null,
})

export const useUser = () => {
  const sessionQuery = useSessionQuery()
  const discoveryQuery = useDiscoveryQuery()
  return useUserQuery({
    variables: {
      session: sessionQuery.data!,
      discovery: discoveryQuery.data!,
    },
    enabled: !!discoveryQuery.data && !!sessionQuery.data,
  })
}

export const useAuthMe = () => {
  const sessionQuery = useSessionQuery()
  return queryClient.useQuery('/auth/me', {}, { enabled: !!sessionQuery.data })
}

export const codeExchange = async ({
  code,
  discovery,
}: {
  code: string
  discovery: DiscoveryDocument
}) => {
  if (!authRequest.codeVerifier) {
    console.error('Code verifier is not set. This should not happen.')
    throw new Error('Code verifier is not set. This should not happen.')
  }
  return exchangeCodeAsync(
    {
      clientId: authRequest.clientId,
      redirectUri: authRequest.redirectUri,
      code: code,
      extraParams: { code_verifier: authRequest.codeVerifier },
    },
    discovery
  )
}

// Might consider using neverthrow
export const login = async ({ discovery }: { discovery: DiscoveryDocument }) => {
  let loginResult: AuthSessionResult
  const browserPackage = await getBrowserPackage()
  try {
    // open in-app browser to login flow in PPLE SSO
    loginResult = await authRequest.promptAsync(discovery, {
      browserPackage,
      showInRecents: true,
    })
  } catch (error) {
    console.error('Error during authentication prompt:', error)
    throw new Error('Error during authentication prompt')
  }
  if (loginResult.type !== 'success') {
    if (loginResult.type === 'error') {
      console.error('Authentication error:', loginResult.error)
    } else {
      console.warn('Authentication cancelled or unknown result type:', loginResult.type)
    }
    throw new Error('Authentication failed or was cancelled')
  }
  try {
    return await codeExchange({
      code: loginResult.params.code,
      discovery: discovery,
    })
  } catch (error) {
    console.error('Error exchanging code:', error)
    throw error
  }
}

// Might consider using neverthrow
export const logout = async ({
  discovery,
  session,
}: {
  discovery: DiscoveryDocument
  session: AuthSession
}) => {
  const endSessionEndpoint = discovery.endSessionEndpoint
  const idToken = session.idToken
  if (!endSessionEndpoint || !idToken) {
    console.error('End session endpoint or id token not available.')
    throw new Error('End session endpoint or id token not available.')
  }
  const url = `${endSessionEndpoint}?id_token_hint=${idToken}&post_logout_redirect_uri=${authRequest.redirectUri}`
  const browserPackage = await getBrowserPackage()
  let result: WebBrowser.WebBrowserAuthSessionResult
  try {
    // open in-app browser to revoke the access token
    // TODO: find a way to customize `Sign In` message to `Logout` instead
    result = await WebBrowser.openAuthSessionAsync(url, null, { browserPackage })
  } catch (error) {
    console.error('Error opening auth session:', error)
    throw new Error('Error opening auth session')
  }
  if (
    !(
      result.type === 'success' ||
      (result.type === WebBrowser.WebBrowserResultType.DISMISS && Platform.OS === 'android')
    )
  ) {
    console.error('Logout cancelled or failed:', result)
    throw new Error('Logout cancelled or failed')
  }
  return result
}

async function getBrowserPackage() {
  try {
    // when default browser is not chrome on Android it will throw an error `No matching browser activity found`
    // we can use `WebBrowser.getCustomTabsSupportingBrowsersAsync()` to get the preferred browser package or list service packages
    if (Platform.OS === 'android') {
      const { preferredBrowserPackage, servicePackages } =
        await WebBrowser.getCustomTabsSupportingBrowsersAsync()
      return preferredBrowserPackage ?? servicePackages[0]
    }
  } catch (error) {
    console.warn('Error getting browser package:', error)
    return undefined
  }
}
