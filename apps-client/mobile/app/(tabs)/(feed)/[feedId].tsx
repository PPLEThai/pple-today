import React, { useEffect } from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { usePathname, useRouter } from 'expo-router'
import { ArrowLeftIcon } from 'lucide-react-native'

import { FeedCommentSection } from '@app/components/feed/comment-section'
import { FeedDetail, FeedDetailSkeleton } from '@app/components/feed/feed-card'
import { reactQueryClient } from '@app/libs/api-client'

export default function FeedDetailPage() {
  const router = useRouter()
  const pathname = usePathname()
  const feedId = pathname.split('/').at(-1)
  const feedContentQuery = reactQueryClient.useQuery('/feed/:id', {
    pathParams: { id: feedId! },
    enabled: !!feedId,
  })
  useEffect(() => {
    if (feedContentQuery.error) {
      console.error('Error fetching feed content:', JSON.stringify(feedContentQuery.error))
      router.replace('/(feed)') // Redirect to feed list on error
    }
  }, [feedContentQuery.error, router])
  if (!feedId) {
    router.replace('/(feed)')
    return null
  }
  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <View className="pt-4 pb-2 px-4 bg-base-bg-white">
        <Button
          variant="outline-primary"
          size="icon"
          onPress={() => router.back()}
          aria-label="Go back"
        >
          <Icon icon={ArrowLeftIcon} size={24} />
        </Button>
      </View>
      <FeedCommentSection
        feedId={feedId}
        headerComponent={
          feedContentQuery.isLoading || !feedContentQuery.data ? (
            <FeedDetailSkeleton />
          ) : (
            <FeedDetail feedItem={feedContentQuery.data} />
          )
        }
      />
    </View>
  )
}
