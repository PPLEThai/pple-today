import * as React from 'react'
import { Dimensions, Platform, View } from 'react-native'

import { Text } from '@pple-today/ui/text'
import { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query'

import { FeedCardSkeleton } from '@app/components/feed/feed-card'

import { RefreshControl } from '../refresh-control'

interface FeedRefreshControlProps {
  headerHeight: number
  onRefresh: () => void | Promise<void>
}
// TODO: make RefreshControl appear on top of the header so that we dont need the headerHeight offset on Android
export function FeedRefreshControl({ headerHeight, ...rest }: FeedRefreshControlProps) {
  return (
    <RefreshControl
      {...rest}
      progressViewOffset={Platform.select({ ios: 0, android: headerHeight })}
    />
  )
}

interface FeedFooterProps {
  queryResult: UseInfiniteQueryResult<InfiniteData<unknown[]>>
  className?: string
}
export function FeedFooter({ queryResult, className }: FeedFooterProps) {
  const minHeight = Dimensions.get('window').height
  if (queryResult.hasNextPage || queryResult.isLoading || queryResult.error) {
    return <FeedCardSkeleton className={className} />
  }
  if (
    queryResult.data &&
    queryResult.data.pages.length === 1 &&
    queryResult.data.pages[0].length === 0
  ) {
    // Empty State
    return (
      <View style={{ minHeight }}>
        <View className="flex flex-col items-center justify-center py-6">
          <Text className="text-base-text-medium font-heading-semibold">ยังไม่มีโพสต์</Text>
        </View>
      </View>
    )
  }
  // Reach end of feed
  return (
    <View className="flex flex-col items-center justify-center py-6">
      <Text className="text-base-text-medium font-heading-semibold">ไม่มีโพสต์เพิ่มเติม</Text>
    </View>
  )
}
