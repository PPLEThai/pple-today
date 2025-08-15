import { useEffect } from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { useMutation } from '@tanstack/react-query'

import PPLEIcon from '@app/assets/pple-icon.svg'
import {
  login,
  useDiscoveryQuery,
  useSessionMutation,
  useSessionQuery,
  useUserQuery,
} from '@app/libs/auth'

export default function Index() {
  const discoveryQuery = useDiscoveryQuery()
  useEffect(() => {
    if (discoveryQuery.error) {
      console.error('Error fetching discovery document:', discoveryQuery.error)
      // TODO: handle error
    }
  }, [discoveryQuery.error])

  const sessionQuery = useSessionQuery()
  const sessionMutation = useSessionMutation()

  const userQuery = useUserQuery({
    variables: {
      session: sessionQuery.data!,
      discovery: discoveryQuery.data!,
    },
    enabled: !!discoveryQuery.data && !!sessionQuery.data,
  })
  useEffect(() => {
    // should this throw into userQuery.error instead?
    if (userQuery.data?.error === 'access_denied') {
      // incase the token is expired
      console.log('Error fetching user info:', userQuery.data)
      sessionMutation.mutate(null)
      return
    }
    if (userQuery.data?.error) {
      console.error('Error fetching user info:', userQuery.data)
      // TODO: handle error in other cases
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userQuery.data])

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
  return (
    <View className="flex flex-col flex-1 items-center justify-center gap-10 bg-base-bg-light">
      <View className="flex flex-col items-center gap-2">
        <View className="w-[100px] h-[100px] flex flex-col items-center justify-center">
          <PPLEIcon />
        </View>
        <H1 className="text-2xl">พรรคประชาชน</H1>
      </View>
      <View className="flex flex-col gap-4 max-w-[279px] w-full">
        <Button
          onPress={() => loginMutation.mutate({ discovery: discoveryQuery.data! })}
          disabled={!discoveryQuery.data || loginMutation.isPending}
        >
          <Text>เข้าสู่ระบบ</Text>
        </Button>
        <Button
          variant="outline"
          onPress={() => loginMutation.mutate({ discovery: discoveryQuery.data! })}
          disabled={!discoveryQuery.data || loginMutation.isPending}
        >
          <Text>สมัครสมาชิก</Text>
        </Button>
      </View>
    </View>
  )
}
