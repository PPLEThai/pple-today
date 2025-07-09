import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Text } from '@pple-today/ui/text'
import { H2 } from '@pple-today/ui/typography'
import {
  AuthRequest,
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

const authRequest: AuthRequest = new AuthRequest({
  responseType: ResponseType.Code,
  clientId: process.env.EXPO_PUBLIC_OIDC_CLIENT_ID ?? '',
  usePKCE: true,
  scopes: ['openid', 'profile', 'email', 'offline_access'],
  codeChallengeMethod: CodeChallengeMethod.S256,
  redirectUri: makeRedirectUri({
    scheme: 'com.example.ticket-app',
    isTripleSlashed: true,
  }),
})

const AUTH_ACCESS_TOKEN_STORAGE_KEY = 'authAccessToken'
const AUTH_REFRESH_TOKEN_STORAGE_KEY = 'authRefreshToken'

const oidcDiscoveryUrl = process.env.EXPO_PUBLIC_OIDC_BASE_URL ?? ''

export function AuthPlayground() {
  const [discovery, setDiscovery] = useState<DiscoveryDocument | null>(null)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string>('')
  const [code, setCode] = useState<string>('')
  const [idToken, setIdToken] = useState<string | null>(null)

  useEffect(() => {
    const getDiscovery = async () => {
      try {
        const fetchedDiscovery = await fetchDiscoveryAsync(oidcDiscoveryUrl)
        console.log('Discovery document fetched:', fetchedDiscovery)
        setDiscovery(fetchedDiscovery)
      } catch (error) {
        console.error('Error fetching discovery document:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
      }
    }
    getDiscovery()
  }, [])

  useEffect(() => {
    const getAccessToken = async () => {
      const token = await getItemAsync(AUTH_ACCESS_TOKEN_STORAGE_KEY)
      if (token) {
        setAccessToken(token)
      } else {
        console.log('No access token found in secure storage.')
      }
    }
    const getRefreshToken = async () => {
      const token = await getItemAsync(AUTH_REFRESH_TOKEN_STORAGE_KEY)
      if (token) {
        setRefreshToken(token)
      } else {
        console.log('No refresh token found in secure storage.')
      }
    }

    getAccessToken()
    getRefreshToken()
  }, [])

  useEffect(() => {
    if (!authRequest?.codeVerifier || !discovery || !code) return

    const getCodeExchange = async () => {
      {
        const tokenResult = await exchangeCodeAsync(
          {
            clientId: authRequest.clientId,
            redirectUri: authRequest.redirectUri,
            code,
            extraParams: {
              code_verifier: authRequest.codeVerifier ?? '',
            },
          },
          discovery
        )

        setAccessToken(tokenResult.accessToken)
        setIdToken(tokenResult.idToken ?? null)
        setRefreshToken(tokenResult.refreshToken ?? null)

        await Promise.all([
          setItemAsync(AUTH_REFRESH_TOKEN_STORAGE_KEY, tokenResult.refreshToken ?? ''),
          setItemAsync(AUTH_ACCESS_TOKEN_STORAGE_KEY, tokenResult.accessToken),
        ])

        setCode('')
      }
    }
    getCodeExchange()
  }, [code, discovery])

  const fetchUser = async () => {
    if (discovery) {
      try {
        const userInfo = await fetchUserInfoAsync(
          {
            accessToken,
          },
          discovery
        )
        console.log('User info fetched successfully:', userInfo)
        setUser(userInfo)
        setError(null)
      } catch (error) {
        console.error('Error fetching user info:', error)
        setUser(null)
        setError(error instanceof Error ? error.message : 'Unknown error')
      }
    }
  }

  const signOut = async () => {
    // open in-app browser to revoke the access token
    if (discovery && discovery.endSessionEndpoint && idToken) {
      const result = await WebBrowser.openAuthSessionAsync(
        `${discovery.endSessionEndpoint}?id_token_hint=${idToken}&post_logout_redirect_uri=${authRequest.redirectUri}`
      )
      if (result.type === 'success') {
        // Clear tokens from secure storage
        await Promise.all([
          setItemAsync(AUTH_ACCESS_TOKEN_STORAGE_KEY, ''),
          setItemAsync(AUTH_REFRESH_TOKEN_STORAGE_KEY, ''),
        ])
        setAccessToken('')
        setRefreshToken(null)
        setUser(null)
        setIdToken(null)
      } else {
        console.warn('Logout cancelled or failed:', result)
      }
    }
  }

  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Auth Playground </H2>
      <Text>AccessToken: {JSON.stringify(accessToken)}</Text>
      <Button
        onPress={async () => {
          if (discovery) {
            const result = await authRequest.promptAsync(discovery)
            if (result.type === 'success') {
              setCode(result.params.code)
              setError(null)
            } else if (result.type === 'error') {
              console.error('Authentication error:', result.error)
            } else {
              console.warn('Authentication cancelled or unknown result type:', result.type)
            }
          }
        }}
      >
        <Text>Login with Zitadel</Text>
      </Button>
      <Button variant="outline" onPress={fetchUser} disabled={!discovery}>
        <Text>Fetch User Info</Text>
      </Button>
      <Button variant="destructive" onPress={signOut} disabled={!discovery}>
        <Text>Logout</Text>
      </Button>
      <Text>User: {JSON.stringify(user, null, 2)}</Text>
      <Text>Error: {JSON.stringify(error)}</Text>
    </View>
  )
}
