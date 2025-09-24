import { useEffect } from 'react'
import { FlatList, View } from 'react-native'

import { useRouter } from 'expo-router'
import { UserRoundPlusIcon } from 'lucide-react-native'

import { UserCard } from '@app/components/feed/user-card'
import { PageHeader } from '@app/components/page-header'
import { reactQueryClient } from '@app/libs/api-client'
import { useSession } from '@app/libs/auth'

export default function PeopleSuggestion() {
  const session = useSession()
  const userSuggestionQuery = reactQueryClient.useQuery(
    '/profile/recommend',
    {},
    {
      enabled: !!session,
      select: (data) => {
        // add a placeholder item if the length is odd to make the grid even
        if (data.length % 2 === 1) {
          return [...data, { id: null }]
        }
        return data
      },
    }
  )
  const router = useRouter()
  useEffect(() => {
    if (!session) {
      router.dismissTo('/')
    }
  }, [session, router])
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
        data={userSuggestionQuery.data ?? []}
        numColumns={2}
        renderItem={({ item }) => {
          if (item.id === null) {
            return <View className="flex-1 mx-1" />
          }
          return <UserCard user={item} className="flex-1 mx-1" />
        }}
      />
    </View>
  )
}
