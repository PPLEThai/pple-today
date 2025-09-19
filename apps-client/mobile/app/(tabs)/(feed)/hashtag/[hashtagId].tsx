import React, { useEffect } from 'react'
import { FlatList, View } from 'react-native'

import { ExtractBodyResponse } from '@pple-today/api-client'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { useInfiniteQuery } from '@tanstack/react-query'
import { usePathname, useRouter } from 'expo-router'
import { ArrowLeftIcon } from 'lucide-react-native'

import { ApplicationApiSchema } from '@api/backoffice/app'
import { FeedCard, FeedCardSkeleton } from '@app/components/feed/feed-card'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'

export default function HashtagFeedPage() {
  const router = useRouter()
  const pathname = usePathname()
  const hashtagId = pathname.split('/').at(-1)
  const hashtagQuery = reactQueryClient.useQuery('/hashtags/:id', {
    pathParams: { id: hashtagId! },
    enabled: !!hashtagId,
  })
  useEffect(() => {
    if (!hashtagId) {
      router.dismissTo('/')
    }
  }, [hashtagId, router])
  useEffect(() => {
    if (hashtagQuery.error) {
      console.error('Error fetching hashtag content:', JSON.stringify(hashtagQuery.error))
      router.dismissTo('/') // Redirect to feed list on error
    }
  }, [hashtagQuery.error, router])
  if (!hashtagId) {
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
      <HashtagFeed
        hashtagId={hashtagId}
        header={
          <View className="pt-2 pb-3 px-4 bg-base-bg-white">
            <Text className="text-3xl text-base-text-high font-anakotmai-bold">
              {hashtagQuery.isLoading || !hashtagQuery.data ? '...' : `${hashtagQuery.data.name}`}
            </Text>
          </View>
        }
      />
    </View>
  )
}

const LIMIT = 10
function HashtagFeed(props: { hashtagId: string; header?: React.ReactElement }) {
  const feedInfiniteQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/feed/hashtag'),
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/feed/hashtag', {
        query: { page: pageParam, limit: LIMIT, hashTagId: props.hashtagId },
      })
      if (response.error) {
        throw response.error
      }
      return response.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _, lastPageParam) => {
      if (lastPage && lastPage.length === 0) {
        return undefined
      }
      if (lastPage.length < LIMIT) {
        return undefined
      }
      return lastPageParam + 1
    },
  })
  React.useEffect(() => {
    if (feedInfiniteQuery.error) {
      console.error('Error fetching feed:', JSON.stringify(feedInfiniteQuery.error))
    }
  }, [feedInfiniteQuery.error])

  const onEndReached = React.useCallback(() => {
    if (!feedInfiniteQuery.isFetching && feedInfiniteQuery.hasNextPage) {
      feedInfiniteQuery.fetchNextPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedInfiniteQuery.isFetching, feedInfiniteQuery.hasNextPage, feedInfiniteQuery.fetchNextPage])

  type GetHashtagFeedResponse = ExtractBodyResponse<ApplicationApiSchema, 'get', '/feed/hashtag'>
  const data = React.useMemo((): GetHashtagFeedResponse[] => {
    if (!feedInfiniteQuery.data) return []
    return feedInfiniteQuery.data.pages
  }, [feedInfiniteQuery.data])

  const Footer =
    feedInfiniteQuery.hasNextPage || feedInfiniteQuery.isLoading || feedInfiniteQuery.error ? (
      <FeedCardSkeleton />
    ) : data.length === 1 && data[0].length === 0 ? (
      // Empty State
      <View className="flex flex-col items-center justify-center py-6">
        <Text className="text-base-text-medium font-anakotmai-medium">ยังไม่มีโพสต์</Text>
      </View>
    ) : (
      // Reach end of feed
      <View className="flex flex-col items-center justify-center py-6">
        <Text className="text-base-text-medium font-anakotmai-medium">ไม่มีโพสต์เพิ่มเติม</Text>
      </View>
    )

  const renderFeedItem = React.useCallback(
    ({ item: items }: { item: GetHashtagFeedResponse; index: number }) => {
      if (!items) {
        return null
      }
      return (
        <>
          {items.map((item) => {
            return <FeedCard key={item.id} feedItem={item} />
          })}
        </>
      )
    },
    []
  )
  return (
    <FlatList
      // onScroll={scrollHandler}
      // headerHeight={headerHeight}
      data={data}
      contentContainerClassName="flex flex-col"
      ListHeaderComponent={props.header}
      // ListHeaderComponent={<AnnouncementSection />}
      ListFooterComponent={Footer}
      onEndReachedThreshold={1}
      onEndReached={onEndReached}
      renderItem={renderFeedItem}
    />
  )
}
