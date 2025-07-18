import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'

import PPLEIcon from '@app/assets/pple-icon.svg'

export default function Index() {
  return (
    <View className="flex flex-col flex-1 items-center justify-center gap-10">
      <View className="flex flex-col items-center gap-2">
        <View className="w-[100px] h-[100px] flex flex-col items-center justify-center">
          <PPLEIcon />
        </View>
        <H1 className="text-2xl">พรรคประชาชน</H1>
      </View>
      <View className="flex flex-col gap-4 max-w-[279px] w-full">
        <Button>
          <Text>เข้าสู่ระบบ</Text>
        </Button>
        <Button variant="outline">
          <Text>สมัครสมาชิก</Text>
        </Button>
      </View>
    </View>
  )
}
