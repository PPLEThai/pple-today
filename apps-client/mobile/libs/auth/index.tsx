import { useEffect, useState } from 'react'
import { createMutation, createQuery } from 'react-query-kit'

import { Button } from '@pple-today/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@pple-today/ui/dialog'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { useRouter } from 'expo-router'
import { TriangleAlertIcon } from 'lucide-react-native'
import { z } from 'zod/v4'

import appConfig from '@app/app.config'
import { environment } from '@app/env'

import { AuthSession, getAuthSession, setAuthSession } from './session'

import { fetchClient, reactQueryClient } from '../api-client'
import { getBrowserPackage } from '../get-browser-package'

const authRequest: AuthRequest = new AuthRequest({
  responseType: ResponseType.Code,
  clientId: environment.EXPO_PUBLIC_OIDC_CLIENT_ID,
  usePKCE: true,
  scopes: ['openid', 'profile', 'phone'],
  codeChallengeMethod: CodeChallengeMethod.S256,
  redirectUri: makeRedirectUri({
    native: `${appConfig.expo.scheme}:///loading`,
  }),
})

// TODO: try queryOptions
export const useDiscoveryQuery = createQuery({
  queryKey: ['discovery'],
  fetcher: () => {
    return fetchDiscoveryAsync(environment.EXPO_PUBLIC_OIDC_BASE_URL)
  },
})

export const useSessionQuery = createQuery({
  queryKey: ['session'],
  fetcher: getAuthSession,
})

const useSetSessionMutation = createMutation({
  mutationKey: ['session'],
  mutationFn: setAuthSession,
})

export const useSessionMutation = () => {
  const queryClient = useQueryClient()
  return useSetSessionMutation({
    onMutate: (session) => {
      // Optimistically update the session query cache
      queryClient.setQueryData(useSessionQuery.getKey(), session)
      if (!session) {
        queryClient.setQueryData(useUserQuery.getKey(), null)
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: useSessionQuery.getKey() })
      queryClient.refetchQueries({ queryKey: useUserQuery.getKey() })
    },
  })
}

const UserInfoSchema = z.object({
  sub: z.string(),
  name: z.string(),
  given_name: z.string(),
  family_name: z.string(),
  locale: z.nullable(z.string()),
  updated_at: z.number(),
  preferred_username: z.string(),
  phone_number: z.string(),
  phone_number_verified: z.boolean(),
})
type UserInfo = z.infer<typeof UserInfoSchema>
interface UseUserQueryVariables {
  session: AuthSession
  discovery: DiscoveryDocument
}
export const useUserQuery = createQuery<
  UserInfo | null,
  UseUserQueryVariables,
  Record<string, any>
>({
  queryKey: ['user'],
  fetcher: async (variables: UseUserQueryVariables) => {
    const userInfo = await fetchUserInfoAsync(
      { accessToken: variables.session.accessToken },
      variables.discovery
    )
    if (userInfo?.error) {
      throw userInfo
    }
    const userInfoResult = UserInfoSchema.safeParse(userInfo)
    if (userInfoResult.error) {
      console.error('Error parsing user info:', userInfoResult.error, userInfo)
      throw userInfoResult.error
    }
    return userInfoResult.data
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
  return useQuery({
    queryKey: reactQueryClient.getQueryKey('/auth/me'),
    queryFn: async () => {
      const session = await getAuthSession()
      if (!session) {
        return null
      }
      const authMeResult = await fetchClient('/auth/me', {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      if (authMeResult.error) {
        throw authMeResult.error
      }
      return authMeResult.data
    },
  })
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
  try {
    return await exchangeCodeAsync(
      {
        clientId: authRequest.clientId,
        redirectUri: authRequest.redirectUri,
        code: code,
        extraParams: { code_verifier: authRequest.codeVerifier },
      },
      discovery
    )
  } catch (error) {
    console.error('Error exchanging code:', error)
    throw error
  }
}

export const AuthLifeCycleHook = () => {
  const discoveryQuery = useDiscoveryQuery()
  useEffect(() => {
    if (discoveryQuery.error) {
      console.error('Error fetching discovery document:', discoveryQuery.error)
    }
  }, [discoveryQuery.error])

  const sessionQuery = useSessionQuery()
  const sessionMutation = useSessionMutation()
  useEffect(() => {
    if (sessionQuery.error) {
      console.error('Error fetching session:', JSON.stringify(sessionQuery.error))
      sessionMutation.mutate(null)
    }
  }, [sessionQuery.error, sessionMutation])

  const userQuery = useUserQuery({
    variables: {
      session: sessionQuery.data!,
      discovery: discoveryQuery.data!,
    },
    enabled: !!discoveryQuery.data && !!sessionQuery.data,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()
  useEffect(() => {
    // incase the session's access token is expired
    if (userQuery.error?.error === 'access_denied') {
      console.log('Error fetching user info:', userQuery.error)
      setDialogOpen(true)
      return
    }
    if (userQuery.error) {
      console.error('Error fetching user info:', userQuery.error)
    }
  }, [userQuery.error])

  // TODO: make these queries run in background with low priority after logging in
  useAuthMe()
  reactQueryClient.useQuery('/profile/me', {}, { enabled: !!userQuery.data })
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <Icon icon={TriangleAlertIcon} size={40} strokeWidth={1} />
          <DialogTitle className="text-2xl font-anakotmai-medium">
            กรุณาเข้าสู่ระบบอีกครั้ง
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          {'ขณะนี้ได้หมดเวลาการใช้งานของคุณ\nกรุณาเข้าสู่ระบบใหม่อีกครั้งเพื่อใช้งานต่อ'}
        </DialogDescription>
        <DialogFooter>
          <Button
            onPress={async () => {
              await sessionMutation.mutateAsync(null)
              router.navigate('/profile')
              setDialogOpen(false)
            }}
          >
            <Text>เข้าสู่ระบบ</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const tokenResponse = await codeExchange({
    code: loginResult.params.code,
    discovery: discovery,
  })
  try {
    const registerResponse = await fetchClient('/auth/register', {
      headers: { Authorization: `Bearer ${tokenResponse.accessToken}` },
      method: 'POST',
      query: { role: 'USER' },
    })
    if (registerResponse.error?.status === 409) {
      console.log('User already exists:', registerResponse.error)
      return { tokenResponse, action: 'login' } as const
    }
    if (registerResponse.error) {
      throw registerResponse.error
    }
    return { tokenResponse, action: 'register' } as const
  } catch (error) {
    console.error('Error during registration:', JSON.stringify(error))
    throw error
  }
}

export const useLoginMutation = () => {
  const sessionMutation = useSessionMutation()
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: login,
    onMutate: () => {
      router.push('/loading')
    },
    onError: (error) => {
      console.error('Error logging in: ', JSON.stringify(error))
      router.navigate('/profile')
    },
    onSuccess: async (result) => {
      // save session in expo session store
      await sessionMutation.mutateAsync({
        accessToken: result.tokenResponse.accessToken,
        refreshToken: result.tokenResponse.refreshToken ?? '',
        idToken: result.tokenResponse.idToken ?? null,
      })
      // reset all reactQueryClient cache
      await queryClient.resetQueries({ queryKey: reactQueryClient.getKey() })
      if (result.action === 'register') {
        router.navigate('/onboarding')
      } else if (result.action === 'login') {
        router.navigate('/')
      }
    },
  })
}

export const logout = async ({
  discovery,
  session,
}: {
  discovery: DiscoveryDocument
  session: AuthSession
}) => {
  if (!discovery.revocationEndpoint) {
    throw new Error('Revocation endpoint is not available.')
  }
  return fetch(discovery.revocationEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: session.accessToken,
      client_id: environment.EXPO_PUBLIC_OIDC_CLIENT_ID,
    }),
  })
}

export const useLogoutMutation = () => {
  const sessionMutation = useSessionMutation()
  const queryClient = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: logout,
    onMutate: () => {
      router.push('/loading')
    },
    onSettled: async (_data, error) => {
      if (error) {
        console.error('Revocation failed', error)
      }
      // Even error occurred, reset session anyway
      // Clear tokens from secure storage
      await sessionMutation.mutateAsync(null)
      // reset all reactQueryClient cache
      await queryClient.resetQueries({ queryKey: reactQueryClient.getKey() })
      router.navigate('/profile')
    },
  })
}
