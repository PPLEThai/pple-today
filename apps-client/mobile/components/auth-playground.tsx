import { useEffect } from 'react'
import { Platform, View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Text } from '@pple-today/ui/text'
import { H2 } from '@pple-today/ui/typography'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AuthRequest,
  AuthSessionResult,
  CodeChallengeMethod,
  exchangeCodeAsync,
  fetchDiscoveryAsync,
  fetchUserInfoAsync,
  makeRedirectUri,
  ResponseType,
} from 'expo-auth-session'
import { getItemAsync, setItemAsync } from 'expo-secure-store'
import * as WebBrowser from 'expo-web-browser'

const authRequest: AuthRequest = new AuthRequest({
  responseType: ResponseType.Code,
  // TODO: assert that these environment variables are set
  clientId: process.env.EXPO_PUBLIC_OIDC_CLIENT_ID ?? '',
  usePKCE: true,
  scopes: ['openid', 'profile', 'email', 'offline_access'],
  codeChallengeMethod: CodeChallengeMethod.S256,
  redirectUri: makeRedirectUri({
    scheme: 'th.or.peoplesparty.ppletoday',
    isTripleSlashed: true,
  }),
})

const AUTH_SESSION_STORAGE_KEY = 'authSession'
interface AuthSession {
  accessToken: string
  refreshToken: string
  idToken: string | null
}

const OIDC_DISCOVERY_URL = process.env.EXPO_PUBLIC_OIDC_BASE_URL ?? ''

export function AuthPlayground() {
  const discoveryQuery = useQuery({
    queryKey: ['discovery'],
    queryFn: () => fetchDiscoveryAsync(OIDC_DISCOVERY_URL),
  })
  useEffect(() => {
    if (discoveryQuery.error) {
      console.error('Error fetching discovery document:', discoveryQuery.error)
      // TODO: handle error
    }
  }, [discoveryQuery.error])

  const sessionQuery = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const session = await getItemAsync(AUTH_SESSION_STORAGE_KEY)
      if (!session) return null
      return JSON.parse(session) as AuthSession | null
    },
  })

  const userQuery = useQuery({
    queryKey: ['user'],
    queryFn: () => {
      return fetchUserInfoAsync(
        { accessToken: sessionQuery.data!.accessToken },
        discoveryQuery.data!
      )
    },
    enabled: !!discoveryQuery.data && !!sessionQuery.data,
    initialData: null,
  })
  useEffect(() => {
    if (userQuery.data?.error === 'access_denied') {
      console.error('Error fetching user info:', userQuery.error)
      setSessionMutation.mutate(null)
      return
    }
    if (userQuery.data?.error) {
      console.error('Error fetching user info:', userQuery.error)
      // TODO: handle error in other cases
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userQuery.data])

  const queryClient = useQueryClient()
  const setSessionMutation = useMutation({
    mutationKey: ['session'],
    mutationFn: async (data: AuthSession | null) => {
      // Update the session query cache immediately
      queryClient.setQueryData(['session'], data)
      if (!data) {
        queryClient.setQueryData(['user'], null)
      }
      return setItemAsync(AUTH_SESSION_STORAGE_KEY, JSON.stringify(data))
    },
    onSuccess: () => {
      sessionQuery.refetch()
      userQuery.refetch()
    },
  })

  const codeExchangeMutation = useMutation({
    mutationKey: ['codeExchange'],
    mutationFn: async ({ code }: { code: string }) => {
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
        discoveryQuery.data!
      )
    },
  })

  const handleLogin = async () => {
    if (!discoveryQuery.data) {
      throw new Error('Discovery document not available')
    }
    let loginResult: AuthSessionResult
    const browserPackage = await getBrowserPackage()
    try {
      // open in-app browser to login flow in PPLE SSO
      loginResult = await authRequest.promptAsync(discoveryQuery.data, { browserPackage })
    } catch (error) {
      console.error('Error during authentication prompt:', error)
      return
    }
    if (loginResult.type !== 'success') {
      if (loginResult.type === 'error') {
        console.error('Authentication error:', loginResult.error)
      } else {
        console.warn('Authentication cancelled or unknown result type:', loginResult.type)
      }
      return
    }
    try {
      const codeExchangeResult = await codeExchangeMutation.mutateAsync({
        code: loginResult.params.code,
      })
      setSessionMutation.mutate({
        accessToken: codeExchangeResult.accessToken,
        refreshToken: codeExchangeResult.refreshToken ?? '',
        idToken: codeExchangeResult.idToken ?? null,
      })
    } catch (error) {
      console.error('Error exchanging code:', error)
    }
  }

  const handleLogout = async () => {
    const endSessionEndpoint = discoveryQuery.data?.endSessionEndpoint
    const idToken = sessionQuery.data?.idToken
    if (!endSessionEndpoint || !idToken) {
      console.error('End session endpoint or id token not available.')
      return
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
      return
    }
    if (result.type !== 'success') {
      console.error('Logout cancelled or failed:', result)
      return
    }
    // Clear tokens from secure storage
    setSessionMutation.mutate(null)
  }

  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Auth Playground </H2>
      <Button
        onPress={handleLogin}
        disabled={!discoveryQuery.data} // TODO: handle with loading state instead of disabling
      >
        <Text>Login with Zitadel</Text>
      </Button>
      <Button variant="outline" onPress={handleLogout} disabled={!sessionQuery.data}>
        <Text>Logout</Text>
      </Button>
      <Text>User: {JSON.stringify(userQuery.data, null, 2)}</Text>
      <Text>Session: {JSON.stringify(sessionQuery.data, null, 2)}</Text>
    </View>
  )
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
    console.log('Error getting browser package:', error)
    return undefined
  }
}
