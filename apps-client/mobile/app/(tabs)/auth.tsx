import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'

import PPLEIcon from '@app/assets/pple-icon.svg'
import { useDiscoveryQuery, useLoginMutation } from '@app/libs/auth'

export default function Index() {
  const discoveryQuery = useDiscoveryQuery()
  const loginMutation = useLoginMutation()
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
