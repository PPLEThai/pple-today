import React, { useEffect } from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon } from 'lucide-react-native'

import { FeedCommentSection } from '@app/components/feed/comment-section'
import { FeedDetail, FeedDetailSkeleton } from '@app/components/feed/feed-card'
import { reactQueryClient } from '@app/libs/api-client'

export default function FeedDetailPage() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const feedId = params.feedId as string
  useEffect(() => {
    if (!feedId) {
      router.dismissTo('/')
    }
  }, [feedId, router])
  const feedContentQuery = reactQueryClient.useQuery('/feed/:id', {
    pathParams: { id: feedId! },
    enabled: !!feedId,
  })
  useEffect(() => {
    if (feedContentQuery.error) {
      console.error('Error fetching feed content:', JSON.stringify(feedContentQuery.error))
      router.dismissTo('/') // Redirect to feed list on error
    }
  }, [feedContentQuery.error, router])
  if (!feedId) {
    return null
  }
  return (
    <View className="flex-1 flex-col bg-base-bg-default">
      <View className="pt-safe-offset-4 pb-2 px-4 bg-base-bg-white">
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
