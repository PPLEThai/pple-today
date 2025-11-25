import React, { useMemo } from 'react'
import { Dimensions, View } from 'react-native'
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated'

import { QUERY_KEY_SYMBOL } from '@pple-today/api-client'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  useQueryClient,
} from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ArrowLeftIcon, HandshakeIcon } from 'lucide-react-native'

import {
  ActivityCard,
  ActivityCardProps,
  ActivityCardSkeleton,
} from '@app/components/activity/activity-card'
import {
  Pager,
  PagerContent,
  PagerContentView,
  PagerHeader,
  PagerHeaderOnly,
  PagerScrollViewProps,
  PagerTabBar,
  PagerTabBarItem,
  PagerTabBarItemIndicator,
} from '@app/components/pager-with-header'
import { RefreshControl } from '@app/components/refresh-control'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { fetchClient } from '@app/libs/api-client'
import { useScrollContext } from '@app/libs/scroll-context'

export default function RecentActivityPage() {
  const router = useRouter()
  return (
    <SafeAreaLayout>
      <Pager>
        <PagerHeader>
          <PagerHeaderOnly>
            <View className="p-4 flex flex-row justify-between items-center bg-base-bg-white">
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
              <View className="flex flex-col bg-base-bg-white items-end">
                <View className="flex flex-row gap-2 items-center">
                  <Icon
                    icon={HandshakeIcon}
                    size={32}
                    strokeWidth={2}
                    className="text-base-primary-default"
                  />
                  <H1 className="text-3xl font-heading-semibold text-base-primary-default">
                    กิจกรรม
                  </H1>
                </View>
                <Text className="font-heading-regular text-base-text-medium">
                  กิจกรรมจากพรรคประชาชน
                </Text>
              </View>
            </View>
          </PagerHeaderOnly>
          <PagerTabBar fullWidth>
            <PagerTabBarItem index={0} className="flex-1">
              วันนี้
            </PagerTabBarItem>
            <PagerTabBarItem index={1} className="flex-1">
              เร็วๆ นี้
            </PagerTabBarItem>
            <PagerTabBarItemIndicator />
          </PagerTabBar>
        </PagerHeader>
        <PagerContentView>
          <View key={0}>
            <PagerContent index={0}>{(props) => <TodayActivityContent {...props} />}</PagerContent>
          </View>
          <View key={1}>
            <PagerContent index={1}>
              {(props) => <UpcomingActivityContent {...props} />}
            </PagerContent>
          </View>
        </PagerContentView>
      </Pager>
    </SafeAreaLayout>
  )
}

const LIMIT = 10
const minHeight = Dimensions.get('window').height
function TodayActivityContent(props: PagerScrollViewProps) {
  const { headerHeight, scrollElRef } = props

  const scrollContext = useScrollContext()
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event, ctx) => {
      'worklet'
      scrollContext?.onScroll?.(event, ctx)
    },
  })

  const recentActivityInfiniteQuery = useInfiniteQuery({
    queryKey: [QUERY_KEY_SYMBOL, 'infinite', 'today-activity'],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const { data, error } = await fetchClient('/events/today', {
        method: 'GET',
        query: { limit: LIMIT, page: pageParam },
      })

      if (error) {
        throw error
      }

      return data
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.result.length < LIMIT) {
        return undefined
      }
      if (!lastPage.data.is_lastpage) {
        return allPages.length + 1
      }
      return undefined
    },
    select: (data) => {
      return {
        pages: data.pages.map((page) => page.result),
        pageParams: data.pageParams,
      }
    },
  })
  const data = useMemo(() => {
    if (!recentActivityInfiniteQuery.data) {
      return []
    }
    return recentActivityInfiniteQuery.data.pages.flat()
  }, [recentActivityInfiniteQuery.data])
  const renderFeedItem = React.useCallback(
    ({ item }: { item: ActivityCardProps['activity']; index: number }) => {
      return <ActivityCard key={item.id} activity={item} className="mt-3 mx-3" />
    },
    []
  )
  const onEndReached = React.useCallback(() => {
    if (
      recentActivityInfiniteQuery.hasNextPage &&
      !recentActivityInfiniteQuery.isFetchingNextPage
    ) {
      recentActivityInfiniteQuery.fetchNextPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    recentActivityInfiniteQuery.hasNextPage,
    recentActivityInfiniteQuery.isFetchingNextPage,
    recentActivityInfiniteQuery.fetchNextPage,
  ])

  const queryClient = useQueryClient()
  const onRefresh = React.useCallback(async () => {
    await queryClient.resetQueries({ queryKey: [QUERY_KEY_SYMBOL, 'infinite', 'today-activity'] })
    await recentActivityInfiniteQuery.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentActivityInfiniteQuery.refetch, queryClient])
  return (
    <Animated.FlatList
      ref={scrollElRef}
      onScroll={scrollHandler}
      data={data}
      className="flex-1"
      contentContainerClassName="flex-grow flex flex-col bg-base-bg-default py-4"
      contentContainerStyle={{ paddingTop: headerHeight, minHeight: minHeight }}
      onEndReachedThreshold={1}
      renderItem={renderFeedItem}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl onRefresh={onRefresh} />}
      onEndReached={onEndReached}
      ListFooterComponent={
        <ActivityFooter queryResult={recentActivityInfiniteQuery} className="mt-3 mx-3" />
      }
    />
  )
}

function UpcomingActivityContent(props: PagerScrollViewProps) {
  const { headerHeight, scrollElRef } = props

  const scrollContext = useScrollContext()
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event, ctx) => {
      'worklet'
      scrollContext?.onScroll?.(event, ctx)
    },
  })

  const recentActivityInfiniteQuery = useInfiniteQuery({
    queryKey: [QUERY_KEY_SYMBOL, 'infinite', 'upcoming-activity'],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const { data, error } = await fetchClient('/events/upcoming', {
        method: 'GET',
        query: { limit: LIMIT, page: pageParam },
      })

      if (error) {
        throw error
      }

      return data
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.result.length < LIMIT) {
        return undefined
      }
      if (!lastPage.data.is_lastpage) {
        return allPages.length + 1
      }
      return undefined
    },
    select: (data) => {
      return {
        pages: data.pages.map((page) => page.result),
        pageParams: data.pageParams,
      }
    },
  })
  const data = useMemo(() => {
    if (!recentActivityInfiniteQuery.data) {
      return []
    }
    return recentActivityInfiniteQuery.data.pages.flat()
  }, [recentActivityInfiniteQuery.data])
  const renderFeedItem = React.useCallback(
    ({ item }: { item: ActivityCardProps['activity']; index: number }) => {
      return <ActivityCard key={item.id} activity={item} className="mt-3 mx-3" />
    },
    []
  )
  const onEndReached = React.useCallback(() => {
    if (
      recentActivityInfiniteQuery.hasNextPage &&
      !recentActivityInfiniteQuery.isFetchingNextPage
    ) {
      recentActivityInfiniteQuery.fetchNextPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    recentActivityInfiniteQuery.hasNextPage,
    recentActivityInfiniteQuery.isFetchingNextPage,
    recentActivityInfiniteQuery.fetchNextPage,
  ])

  const queryClient = useQueryClient()
  const onRefresh = React.useCallback(async () => {
    await queryClient.resetQueries({
      queryKey: [QUERY_KEY_SYMBOL, 'infinite', 'upcoming-activity'],
    })
    await recentActivityInfiniteQuery.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentActivityInfiniteQuery.refetch, queryClient])

  return (
    <Animated.FlatList
      ref={scrollElRef}
      onScroll={scrollHandler}
      data={data}
      className="flex-1"
      contentContainerClassName="flex-grow flex flex-col bg-base-bg-default py-4"
      contentContainerStyle={{ paddingTop: headerHeight, minHeight: minHeight }}
      onEndReachedThreshold={1}
      renderItem={renderFeedItem}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl onRefresh={onRefresh} />}
      onEndReached={onEndReached}
      ListFooterComponent={
        <ActivityFooter queryResult={recentActivityInfiniteQuery} className="mt-3 mx-3" />
      }
    />
  )
}

interface ActivityFooterProps {
  queryResult: UseInfiniteQueryResult<InfiniteData<unknown[]>>
  className?: string
}
function ActivityFooter({ queryResult, className }: ActivityFooterProps) {
  if (queryResult.hasNextPage || queryResult.isLoading || queryResult.error) {
    return <ActivityCardSkeleton className={className} />
  }
  if (
    queryResult.data &&
    queryResult.data.pages.length === 1 &&
    queryResult.data.pages[0].length === 0
  ) {
    // Empty State
    return (
      <View className="flex flex-col items-center justify-center py-6">
        <Text className="text-base-text-medium font-heading-semibold">ยังไม่มีกิจกรรม</Text>
      </View>
    )
  }
  // Reach end of feed
  return null
}
