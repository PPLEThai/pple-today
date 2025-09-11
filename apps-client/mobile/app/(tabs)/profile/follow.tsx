import { View } from 'react-native'

import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { CircleUserRoundIcon, Heart, MessageSquareHeartIcon } from 'lucide-react-native'

import { Header } from '@app/components/header-navigation'
import { reactQueryClient } from '@app/libs/api-client'

export default function FollowPage() {
  return (
    <View className="flex-1 flex-col">
      <Header icon={Heart} title="จัดการเนื้อหาที่ติดตาม" />
      <FollowingSection />
    </View>
  )
}

const FollowingSection = () => {
  const profileQuery = reactQueryClient.useQuery('/profile/me', {})

  return (
    <View className="m-4 mb-6 flex flex-col items-center py-2 justify-between gap-2 bg-base-bg-default rounded-xl border border-base-outline-default">
      <View className="flex flex-row justify-between items-center px-2 w-full">
        <View className="flex flex-row gap-3 items-center">
          <Icon
            icon={MessageSquareHeartIcon}
            className="text-base-primary-default"
            size={24}
            strokeWidth={1}
          />
          <Text className="text-base text-base-text-high font-anakotmai-medium">หัวข้อ</Text>
        </View>

        <Text className="text-base text-base-text-high font-anakotmai-light">
          {profileQuery.isLoading || !profileQuery.data ? (
            <View className="rounded-full bg-base-bg-default mt-2 h-4" />
          ) : (
            <Text className="text-base text-base-primary-medium font-anakotmai-medium">
              {profileQuery.data.numberOfFollowingTopics}
            </Text>
          )}{' '}
          หัวข้อ
        </Text>
      </View>
      <View className="flex flex-row justify-between items-center px-2 w-full">
        <View className="flex flex-row gap-3 items-center">
          <Icon
            icon={CircleUserRoundIcon}
            className="text-base-primary-default"
            size={24}
            strokeWidth={1}
          />
          <Text className="text-base text-base-text-high font-anakotmai-medium">ผู้คน</Text>
        </View>
        <Text className="text-base text-base-text-high font-anakotmai-light">
          {profileQuery.isLoading || !profileQuery.data ? (
            <View className="rounded-full bg-base-bg-default mt-2 h-4" />
          ) : (
            <Text className="text-base text-base-primary-medium font-anakotmai-medium">
              {profileQuery.data.numberOfFollowing}
            </Text>
          )}{' '}
          คน
        </Text>
      </View>
    </View>
  )
}
