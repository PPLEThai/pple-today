import { View } from 'react-native'

import { AnimatedBackgroundPressable } from '@pple-today/ui/animated-pressable'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { H2 } from '@pple-today/ui/typography'
import { ContactRoundIcon, MapPinnedIcon } from 'lucide-react-native'

import { useAuthMe } from '@app/libs/auth'

interface UserInfoAddressSectionProps {
  className?: string
}

export function UserAddressInfoSection(props: UserInfoAddressSectionProps) {
  const authMeQuery = useAuthMe()
  // hide when not yet onboarded and therefore no address data
  if (!authMeQuery.data?.address) {
    return null
  }
  return (
    <View className={cn('flex flex-row justify-between items-center w-full px-4', props.className)}>
      <View className="flex flex-col items-start">
        <View className="flex flex-row items-center gap-2">
          <Icon icon={MapPinnedIcon} size={16} className="text-base-primary-medium" />
          <H2 className="text-xs text-base-text-high font-heading-regular">พื้นที่ของคุณ</H2>
        </View>
        <Text className="text-lg text-base-primary-default font-heading-bold">
          {authMeQuery.data.address.subDistrict}, {authMeQuery.data.address.district}
        </Text>
        <Text className="text-xs text-base-text-high font-heading-regular">
          {authMeQuery.data.address.province}
        </Text>
      </View>
      {/* TODO: style active state & navigate */}
      <AnimatedBackgroundPressable className="flex flex-row items-center gap-3 border border-base-outline-default rounded-2xl p-4">
        <View className="w-8 h-8 flex items-center justify-center rounded-lg bg-base-primary-medium">
          <Icon
            icon={ContactRoundIcon}
            size={24}
            className="text-base-text-invert"
            strokeWidth={1}
          />
        </View>
        <Text className="text-sm text-base-text-high font-heading-medium">
          ดูข้อมูล{'\n'}
          สส. ของคุณ
        </Text>
      </AnimatedBackgroundPressable>
    </View>
  )
}

UserAddressInfoSection.displayName = 'UserAddressInfoSection'
