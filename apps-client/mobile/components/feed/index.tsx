import * as React from 'react'
import { Dimensions, Platform, RefreshControl, View } from 'react-native'

import { Text } from '@pple-today/ui/text'
import { InfiniteData, UseInfiniteQueryResult } from '@tanstack/react-query'

import { FeedCardSkeleton } from '@app/components/feed/feed-card'

interface FeedRefreshControlProps {
  headerHeight: number
  onRefresh: () => void
}
// TODO: make RefreshControl appear on top of the header so that we dont need the headerHeight offset on Android
export function FeedRefreshControl({
  headerHeight,
  onRefresh: onRefreshProp,
  ...rest
}: FeedRefreshControlProps) {
  const [refreshing, setRefreshing] = React.useState(false)
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    await onRefreshProp()
    setRefreshing(false)
  }, [onRefreshProp])
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      progressViewOffset={Platform.select({ ios: 0, android: headerHeight })}
      colors={['#FF6A13']} // base-primary-default
      {...rest} // make sure overridden styles (from RN) are passed down
    />
  )
}

interface FeedFooterProps {
  queryResult: UseInfiniteQueryResult<InfiniteData<unknown[]>>
}
export function FeedFooter({ queryResult }: FeedFooterProps) {
  const minHeight = Dimensions.get('window').height
  if (queryResult.hasNextPage || queryResult.isLoading || queryResult.error) {
    return <FeedCardSkeleton />
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
          <Text className="text-base-text-medium font-anakotmai-medium">ยังไม่มีโพสต์</Text>
        </View>
      </View>
    )
  }
  // Reach end of feed
  return (
    <View className="flex flex-col items-center justify-center py-6">
      <Text className="text-base-text-medium font-anakotmai-medium">ไม่มีโพสต์เพิ่มเติม</Text>
    </View>
  )
}
