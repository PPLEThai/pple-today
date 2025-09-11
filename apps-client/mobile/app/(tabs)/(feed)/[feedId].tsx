import React from 'react'
import { View } from 'react-native'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { usePathname, useRouter } from 'expo-router'
import { ArrowLeftIcon } from 'lucide-react-native'

import type { GetFeedContentResponse } from '@api/backoffice/app'
import { FeedCommentSection } from '@app/components/feed/comment-section'
import { FeedDetail } from '@app/components/feed/feed-card'
import { reactQueryClient } from '@app/libs/api-client'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'

export default function FeedDetailPage() {
  const router = useRouter()
  const pathname = usePathname()
  const feedId = pathname.split('/').at(-1)
  const feedContentQuery = reactQueryClient.useQuery('/feed/:id', {
    pathParams: { id: feedId! },
    enabled: !!feedId,
  })
  if (!feedId) {
    router.replace('/(feed)')
    return null
  }
  if (feedContentQuery.isLoading || !feedContentQuery.data) {
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
        headerComponent={<FeedItemDetail item={feedContentQuery.data} />}
      />
    </View>
  )
}

function FeedItemDetail({ item }: { item: GetFeedContentResponse }) {
  switch (item.type) {
    case 'POST':
      return <FeedDetail key={item.id} feedItem={item} />
    case 'POLL':
      // TODO: poll feed
      return null
    case 'ANNOUNCEMENT':
      // expected no announcement
      return null
    default:
      return exhaustiveGuard(item)
  }
}
