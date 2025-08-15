import { useEffect } from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Text } from '@pple-today/ui/text'
import { H2 } from '@pple-today/ui/typography'
import { useMutation } from '@tanstack/react-query'

import {
  login,
  logout,
  useDiscoveryQuery,
  useSessionMutation,
  useSessionQuery,
  useUser,
} from '@app/libs/auth'

export function AuthPlayground() {
  const discoveryQuery = useDiscoveryQuery()
  useEffect(() => {
    if (discoveryQuery.error) {
      console.error('Error fetching discovery document:', discoveryQuery.error)
      // TODO: handle error
    }
  }, [discoveryQuery.error])

  const sessionQuery = useSessionQuery()
  const sessionMutation = useSessionMutation()

  const userQuery = useUser()

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (result) => {
      sessionMutation.mutate({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken ?? '',
        idToken: result.idToken ?? null,
      })
    },
  })
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // Clear tokens from secure storage
      sessionMutation.mutate(null)
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
