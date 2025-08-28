import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Text } from '@pple-today/ui/text'
import { H2 } from '@pple-today/ui/typography'

import {
  useAuthMe,
  useDiscoveryQuery,
  useLoginMutation,
  useLogoutMutation,
  useSessionQuery,
  useUser,
} from '@app/libs/auth'

export function AuthPlayground() {
  const discoveryQuery = useDiscoveryQuery()
  const sessionQuery = useSessionQuery()
  const userQuery = useUser()
  const loginMutation = useLoginMutation()
  const logoutMutation = useLogoutMutation()
  const authMeQuery = useAuthMe()
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
        disabled={!discoveryQuery.data || !sessionQuery.data || logoutMutation.isPending}
      >
        <Text>Logout</Text>
      </Button>
      <Text>See Full Data in Tanstack Bubble</Text>
      <Text className="line-clamp-2">
        Discovery: {JSON.stringify(discoveryQuery.data, null, 2)}
      </Text>
      <Text className="line-clamp-2">Session: {JSON.stringify(sessionQuery.data, null, 2)}</Text>
      <Text>User: {JSON.stringify(userQuery.data, null, 2)}</Text>
      <Text>Auth Me: {JSON.stringify(authMeQuery.data, null, 2)}</Text>
    </View>
  )
}
