import { View } from 'react-native'

import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { PackageOpenIcon, SearchIcon } from 'lucide-react-native'

export function SearchNotFound() {
  return (
    <View className="items-center justify-start pt-16 mx-4 border bg-base-bg-light gap-3 border-base-outline-default rounded-xl flex-1 px-[98px]">
      <Icon icon={PackageOpenIcon} size={64} className="text-base-outline-medium" strokeWidth={1} />
      <Text className="font-heading-regular text-base-text-placeholder text-center">
        ไม่พบผลลัพธ์ที่ค้นหา
      </Text>
    </View>
  )
}
SearchNotFound.displayName = 'SearchNotFound'

export function SearchNotEntered() {
  return (
    <View className="items-center justify-start pt-16 mx-4 border bg-base-bg-light gap-3 border-base-outline-default rounded-xl flex-1 px-[98px]">
      <Icon icon={SearchIcon} size={64} className="text-base-outline-medium" strokeWidth={1} />
      <Text className="font-heading-regular text-base-text-placeholder text-center">
        พิมพ์ที่กล่องข้อความเพื่อค้นหาผู้คน, หัวข้อ, โพสต์
      </Text>
    </View>
  )
}
SearchNotEntered.displayName = 'SearchNotEntered'
