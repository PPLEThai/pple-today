import { View } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'

import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1, H2 } from '@pple-today/ui/typography'
import { LandmarkIcon, MegaphoneIcon } from 'lucide-react-native'

import { UserAddressInfoSection } from '@app/components/address-info'

export default function OfficialPage() {
  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <ScrollView>
        <View className="flex flex-col p-4 bg-base-bg-white">
          <View className="flex flex-row gap-2 items-center">
            <Icon
              icon={LandmarkIcon}
              size={32}
              strokeWidth={2}
              className="text-base-primary-default"
            />
            <H1 className="text-3xl font-anakotmai-medium text-base-primary-default mt-2">
              ทางการ
            </H1>
          </View>
          <Text className="font-anakotmai-light text-base-text-medium">
            ข้อมูลข่าวสารจากพรรคประชาชน
          </Text>
        </View>
        <UserAddressInfoSection className="pb-4 bg-base-bg-white" />
        <View className="gap-3 py-3">
          <DemoSection />
          <DemoSection />
          <DemoSection />
          <DemoSection />
        </View>
      </ScrollView>
    </View>
  )
}

const DemoSection = () => {
  return (
    <View className="px-4">
      <View className="flex flex-row gap-2 items-center">
        <View className="w-8 h-8 flex items-center justify-center">
          <Icon icon={MegaphoneIcon} size={32} className="text-base-primary-default" />
        </View>
        <H2 className="text-2xl font-anakotmai-medium text-base-text-high">ประกาศ</H2>
      </View>
      <View className="h-48 bg-base-bg-white rounded-xl border border-base-outline-default mt-2 p-4"></View>
    </View>
  )
}
