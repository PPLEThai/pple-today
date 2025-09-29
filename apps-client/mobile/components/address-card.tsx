import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { Pencil, PlusIcon } from 'lucide-react-native'

interface Address {
  province: string
  district: string
  subDistrict: string
  postalCode: string
}

export function AddressCard({
  address,
  handleOpenForm,
}: {
  address: Address | null
  handleOpenForm: () => void
}) {
  if (address) {
    return (
      <View className="p-4 bg-base-bg-default rounded-xl gap-2">
        <View>
          <Text className="font-heading-semibold">ที่อยู่ของคุณ</Text>
        </View>
        <View className="pb-2">
          <View>
            <Text className="font-body-light line-clamp-1">
              {address.province === 'กรุงเทพมหานคร' ? 'แขวง' : 'ต.'}
              {address.subDistrict} {address.province === 'กรุงเทพมหานคร' ? 'เขต' : 'อ.'}
              {address.district}
            </Text>
            <Text className="font-body-light line-clamp-1">
              จ.{address.province} {address.postalCode}
            </Text>
          </View>
        </View>
        <Button variant="outline" onPress={handleOpenForm}>
          <Icon icon={Pencil} />
          <Text>แก้ไขที่อยู่</Text>
        </Button>
      </View>
    )
  }

  return (
    <View className="p-4 bg-base-bg-default rounded-xl">
      <View className="pb-4">
        <Text className="font-heading-semibold">ที่อยู่ของคุณ</Text>
      </View>
      <Button onPress={handleOpenForm}>
        <Icon icon={PlusIcon} />
        <Text>เพิ่มที่อยู่</Text>
      </Button>
    </View>
  )
}
