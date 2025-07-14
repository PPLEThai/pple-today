import { useEffect } from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Text } from '@pple-today/ui/text'
import { H2 } from '@pple-today/ui/typography'
import { useMutation } from '@tanstack/react-query'
import { DiscoveryDocument } from 'expo-auth-session'

import {
  AuthSession,
  login,
  logout,
  useDiscoveryQuery,
  useSessionQuery,
  useSetSession,
  useUserQuery,
} from '@app/query/auth'

export function AuthPlayground() {
  const discoveryQuery = useDiscoveryQuery()
  useEffect(() => {
    if (discoveryQuery.error) {
      console.error('Error fetching discovery document:', discoveryQuery.error)
      // TODO: handle error
    }
  }, [discoveryQuery.error])

  const sessionQuery = useSessionQuery()

  const userQuery = useUserQuery({
    variables: {
      session: sessionQuery.data!,
      discovery: discoveryQuery.data!,
    },
    enabled: !!discoveryQuery.data && !!sessionQuery.data,
  })
  useEffect(() => {
    if (userQuery.data?.error === 'access_denied') {
      console.error('Error fetching user info:', userQuery.data)
      setSessionMutation.mutate(null)
      return
    }
    if (userQuery.data?.error) {
      console.error('Error fetching user info:', userQuery.data)
      // TODO: handle error in other cases
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userQuery.data])

  const setSessionMutation = useSetSession()

  const loginMutation = useMutation({
    mutationFn: ({ discovery }: { discovery: DiscoveryDocument }) => {
      return login({ discovery })
    },
    onSuccess: (result) => {
      setSessionMutation.mutate({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken ?? '',
        idToken: result.idToken ?? null,
      })
    },
  })
  const logoutMutation = useMutation({
    mutationFn: ({
      discovery,
      session,
    }: {
      discovery: DiscoveryDocument
      session: AuthSession
    }) => {
      return logout({ discovery, session })
    },
    onSuccess: () => {
      // Clear tokens from secure storage
      setSessionMutation.mutate(null)
    },
  })
  return (
    <View className="flex flex-col gap-2">
      <H2 className="font-inter-bold">Auth Playground </H2>
      <Button
        onPress={() => loginMutation.mutate({ discovery: discoveryQuery.data! })}
        disabled={!discoveryQuery.data} // TODO: handle with loading state instead of disabling
      >
        <Text>Login with Zitadel</Text>
      </Button>
      <Button
        variant="outline"
        onPress={() =>
          logoutMutation.mutate({ discovery: discoveryQuery.data!, session: sessionQuery.data! })
        }
        disabled={!sessionQuery.data || !sessionQuery.data}
      >
        <Text>Logout</Text>
      </Button>
      <Text>User: {JSON.stringify(userQuery.data, null, 2)}</Text>
      <Text>Session: {JSON.stringify(sessionQuery.data, null, 2)}</Text>
    </View>
  )
}
