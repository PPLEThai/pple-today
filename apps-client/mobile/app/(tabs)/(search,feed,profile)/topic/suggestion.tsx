import { useEffect } from 'react'
import { FlatList, View } from 'react-native'

import { useRouter } from 'expo-router'
import { MegaphoneIcon } from 'lucide-react-native'

import { TopicCard } from '@app/components/feed/topic-card'
import { PageHeader } from '@app/components/page-header'
import { reactQueryClient } from '@app/libs/api-client'
import { useSession } from '@app/libs/auth'

export default function TopicSuggestionPage() {
  const session = useSession()
  const topicSuggestionQuery = reactQueryClient.useQuery(
    '/topics/recommend',
    {},
    { enabled: !!session, refetchOnMount: false }
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
        icon={MegaphoneIcon}
        title="หัวข้อน่าสนใจ"
        subtitle="คุณติดตามหัวข้อเหล่านี้แล้วหรือยัง?"
      />
      <FlatList
        contentContainerClassName="py-4 px-3 gap-3"
        showsVerticalScrollIndicator={false}
        data={topicSuggestionQuery.data ?? []}
        renderItem={({ item }) => <TopicCard topic={item} className="w-full h-[243px]" />}
      />
    </View>
  )
}
