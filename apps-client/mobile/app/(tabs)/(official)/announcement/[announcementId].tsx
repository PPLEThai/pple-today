import React from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1, H2 } from '@pple-today/ui/typography'
import { usePathname, useRouter } from 'expo-router'
import { ArrowLeftIcon, FileTextIcon, LandmarkIcon } from 'lucide-react-native'

import { FeedCommentSection } from '@app/components/feed/comment-section'
import { reactQueryClient } from '@app/libs/api-client'

export default function AnnouncementPage() {
  const router = useRouter()
  const pathname = usePathname()
  const announcementId = pathname.split('/').at(-1)
  const announcementQuery = reactQueryClient.useQuery('/announcements/:id', {
    pathParams: { id: announcementId! },
    enabled: !!announcementId,
  })
  React.useEffect(() => {
    if (announcementQuery.error) {
      console.error('Error fetching announcement:', JSON.stringify(announcementQuery.error))
      router.replace('/(announcement)')
    }
  }, [announcementQuery.error, router])
  if (!announcementId) {
    router.replace('/(announcement)')
    return null
  }
  if (announcementQuery.isLoading || !announcementQuery.data) {
    return null
  }
  const data = announcementQuery.data

  return (
    <View className="flex-1 bg-base-bg-light flex flex-col">
      <View className="p-4 pb-2 flex flex-col gap-3 bg-base-bg-white">
        <Button
          variant="outline-primary"
          size="icon"
          aria-label="กลับ"
          onPress={() => router.back()}
        >
          <Icon icon={ArrowLeftIcon} size={24} />
        </Button>
      </View>
      <FeedCommentSection
        feedId={data.feedItemId}
        headerComponent={
          <View className="p-4 pt-1 flex flex-col gap-3 bg-base-bg-white">
            <View className="flex flex-row items-center gap-2">
              {/* TODO: Logo */}
              <View className="rounded-full size-8 bg-rose-800 flex items-center justify-center">
                <Icon icon={LandmarkIcon} size={16} className="text-base-bg-white" />
              </View>
              <H2 className="text-sm font-anakotmai-medium text-base-text-medium">
                ประกาศจากทางการ
              </H2>
            </View>
            <H1 className="text-lg font-anakotmai-medium text-base-text-high">{data.title}</H1>
            <Text className="text-base font-noto-light text-base-text-high">{data.content}</Text>
            <Button className="self-start">
              <Icon icon={FileTextIcon} />
              <Text>ดูเอกสาร</Text>
            </Button>
          </View>
        }
      />
    </View>
  )
}
