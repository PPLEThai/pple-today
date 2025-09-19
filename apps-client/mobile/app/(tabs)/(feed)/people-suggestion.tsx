import { FlatList, View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { useRouter } from 'expo-router'
import { ArrowLeftIcon, UserRoundPlusIcon } from 'lucide-react-native'

import { PeopleCard } from '@app/components/feed/people-card'

export default function PeopleSuggestion() {
  const router = useRouter()

  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <View className="p-4 flex flex-row justify-between items-center border-b border-base-outline-default bg-base-bg-white">
        <Button
          variant="outline-primary"
          size="icon"
          onPress={() => {
            router.back()
          }}
          aria-label="กลับ"
        >
          <Icon icon={ArrowLeftIcon} size={24} strokeWidth={2} />
        </Button>
        <View className="flex flex-col gap-1 items-end">
          <View className="inline-flex flex-row justify-center gap-2 items-center">
            <Icon
              icon={UserRoundPlusIcon}
              size={32}
              className="text-base-primary-default align-middle"
            />
            <H1 className="font-anakotmai-medium text-3xl text-base-primary-default">
              แนะนำให้ติดตาม
            </H1>
          </View>
          <Text className="text-base-text-medium text-base font-anakotmai-light">
            คุณติดตามบุคคลเหล่านี้แล้วหรือยัง?
          </Text>
        </View>
      </View>
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
        renderItem={({ item }) => <PeopleCard user={item} className="flex-1 mx-1" />}
      />
    </View>
  )
}
