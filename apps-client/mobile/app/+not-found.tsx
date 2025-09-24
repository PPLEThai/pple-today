import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { useRouter } from 'expo-router'
import { TriangleAlertIcon } from 'lucide-react-native'

export default function NotFound() {
  const router = useRouter()
  return (
    <View className="flex-1 bg-base-bg-light flex flex-col justify-center items-center">
      <Icon icon={TriangleAlertIcon} className="text-base-text-placeholder" size={60} />
      <H1 className="text-2xl font-heading-semibold py-4 text-base-text-medium">ไม่พบเนื้อหา</H1>
      <Button onPress={() => router.dismissTo('/')}>
        <Text>กลับสู่หน้าหลัก</Text>
      </Button>
    </View>
  )
}
