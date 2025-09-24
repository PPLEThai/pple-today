import { FlatList, View } from 'react-native'

import { UserRoundPlusIcon } from 'lucide-react-native'

import { UserCard } from '@app/components/feed/user-card'
import { PageHeader } from '@app/components/page-header'

export default function PeopleSuggestion() {
  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <PageHeader
        icon={UserRoundPlusIcon}
        title="แนะนำให้ติดตาม"
        subtitle="คุณติดตามบุคคลเหล่านี้แล้วหรือยัง?"
      />
      <FlatList
        contentContainerClassName="py-4 px-3 gap-4"
        showsVerticalScrollIndicator={false}
        data={Array.from({ length: 20 }).map((_, i) => ({
          id: `user-${i}`,
          name: 'สมชาย ใจดี',
          avatarUrl: '',
          followed: false,
          address: { province: 'กรุงเทพมหานคร' },
        }))}
        numColumns={2}
        renderItem={({ item }) => <UserCard user={item} className="flex-1 mx-1" />}
      />
    </View>
  )
}
