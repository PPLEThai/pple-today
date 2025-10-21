import React, { useCallback, useEffect, useMemo } from 'react'
import { View } from 'react-native'
import Animated from 'react-native-reanimated'

import { QUERY_KEY_SYMBOL } from '@pple-today/api-client'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Text } from '@pple-today/ui/text'
import { H1, H2, H3 } from '@pple-today/ui/typography'
import {
  InfiniteData,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  useQueryClient,
} from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Image } from 'expo-image'
import { Link } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import {
  ArrowRightIcon,
  CalendarHeartIcon,
  CalendarIcon,
  CircleArrowRightIcon,
  HandshakeIcon,
  ListTodoIcon,
  TicketIcon,
} from 'lucide-react-native'

import { FeedItem, FeedItemPoll, ListPollsResponse } from '@api/backoffice/app'
import {
  ActivityCard,
  ActivityCardProps,
  ActivityCardSkeleton,
} from '@app/components/activity/activity-card'
import { FeedCard, FeedCardSkeleton } from '@app/components/feed/feed-card'
import { RefreshControl } from '@app/components/refresh-control'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { fetchClient } from '@app/libs/api-client'
import { useSession } from '@app/libs/auth'
import {
  EXAMPLE_ACTIVITY,
  GetPPLEActivity,
  mapToActivity,
  useRecentActivityQuery,
} from '@app/libs/pple-activity'

import { useBottomTabOnPress } from '../_layout'

export default function ActivityPage() {
  return (
    <SafeAreaLayout>
      <PollFeedSection
        ListHeaderComponent={
          <>
            <View className="flex flex-col p-4 bg-base-bg-white">
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
            <RecentActivity />
          </>
        }
      />
    </SafeAreaLayout>
  )
}

// Might not be used
export function MyActivity() {
  const session = useSession()
  if (!session) {
    return null
  }
  const isLoading = false // TODO: fetch user's activities
  const activity = EXAMPLE_ACTIVITY
  return (
    <View className="px-4">
      <View className="rounded-2xl border border-base-outline-default bg-base-bg-white px-4 py-3 flex flex-col gap-3">
        <View className="flex flex-row gap-2 items-center pt-0.5 pb-2.5 border-b border-base-outline-default w-full">
          <Icon
            icon={TicketIcon}
            size={32}
            className="text-base-primary-default"
            strokeWidth={1.5}
          />
          <H2 className="text-xl font-heading-semibold text-base-text-high">กิจกรรมของฉัน</H2>
        </View>
        {/* TODO  */}
        {isLoading &&
          Array.from({ length: 2 }).map((_, idx) => (
            <View className="flex flex-row items-center gap-3" key={idx}>
              <Skeleton className="w-12 h-12 rounded-lg" />
              <View className="flex flex-col flex-1">
                <Skeleton className="h-[14px] mt-[6px] w-full" />
                <Skeleton className="h-[14px] mt-[6px] w-3/4" />
                <Skeleton className="h-[14px] mt-[6px] w-1/2" />
              </View>
              <View className="size-10 flex items-center justify-center">
                <Skeleton className="size-6" />
              </View>
            </View>
          ))}
        {/* TODO */}
        {Array.from({ length: 2 }).map((_, idx) => (
          <View key={idx} className="flex flex-row items-center gap-3">
            <Image
              source={{ uri: activity.image }}
              className="w-12 h-12 rounded-lg bg-base-bg-default"
            />
            <View className="flex flex-col flex-1">
              <H3 className="text-sm font-heading-medium text-base-text-high line-clamp-2">
                {activity.name}
              </H3>
              <View className="flex flex-row gap-1 items-center">
                <Icon icon={CalendarIcon} size={12} className="text-base-primary-default" />
                <Text className="text-base-primary-default text-xs font-heading-regular flex-1">
                  {dayjs(activity.startAt).isSame(dayjs(activity.endAt), 'day')
                    ? dayjs(activity.startAt).format('dd D MMM BB')
                    : `${dayjs(activity.startAt).format('dd D MMM')} - ${dayjs(activity.endAt).format('D MMM BB')}`}
                </Text>
              </View>
            </View>
            <Button
              variant="ghost"
              size="icon"
              aria-label="ดูกิจกรรม"
              onPress={() => {
                WebBrowser.openBrowserAsync(activity.url)
              }}
            >
              <Icon
                icon={CircleArrowRightIcon}
                size={24}
                strokeWidth={1}
                className="text-base-text-high"
              />
            </Button>
          </View>
        ))}
        <Link asChild href="/activity/my-activities">
          <Button variant="secondary" size="sm">
            <Text>ดูประวัติกิจกรรม</Text>
          </Button>
        </Link>
      </View>
    </View>
  )
}

function RecentActivity() {
  const recentActivityQuery = useRecentActivityQuery({
    variables: { limit: 3 },
    select: useCallback((data: GetPPLEActivity): ActivityCardProps['activity'][] => {
      return data.result.map(mapToActivity)
    }, []),
  })
  useEffect(() => {
    if (recentActivityQuery.isError) {
      console.error('Error fetching recent activity:', recentActivityQuery.error)
    }
  }, [recentActivityQuery])
  if (recentActivityQuery.isError) {
    return null
  }
  return (
    <View className="px-4 flex flex-col gap-3 pt-4">
      <View className="flex flex-row justify-between items-center">
        <View className="flex flex-row gap-2 items-center">
          <Icon icon={CalendarHeartIcon} className="size-8 text-base-primary-default" />
          <H2 className="text-2xl text-base-text-high font-heading-semibold">กิจกรรมช่วงนี้</H2>
        </View>
        <Link asChild href="/activity/recent">
          <Button variant="ghost">
            <Text>ดูทั้งหมด</Text>
            <Icon icon={ArrowRightIcon} />
          </Button>
        </Link>
      </View>
      {recentActivityQuery.isError ? null : recentActivityQuery.isLoading ? (
        <>
          <ActivityCardSkeleton />
          <ActivityCardSkeleton />
          <ActivityCardSkeleton />
        </>
      ) : !recentActivityQuery.data || recentActivityQuery.data.length === 0 ? (
        <Text className="text-base-text-medium w-full text-center">ไม่มีข้อมูลกิจกรรม</Text>
      ) : (
        recentActivityQuery.data.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))
      )}
    </View>
  )
}

function PollFeedSection(props: { ListHeaderComponent: React.ReactNode }) {
  const session = useSession()

  const listPollQuery = useInfiniteQuery({
    queryKey: [QUERY_KEY_SYMBOL, 'infinite', 'polls'],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/polls', {
        query: { page: pageParam, limit: 10 },
      })
      if (response.error) {
        throw response.error
      }
      return response.data
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.data.length < 10) {
        return undefined
      }
      return allPages.length + 1
    },
    select: useCallback((data: InfiniteData<ListPollsResponse>): InfiniteData<FeedItemPoll[]> => {
      return {
        pageParams: data.pageParams,
        pages: data.pages.map((page) => page.data),
      }
    }, []),
    enabled: !!session,
  })
  const data: FeedItemPoll[] = useMemo(() => {
    if (!listPollQuery.data) {
      return []
    }
    return listPollQuery.data.pages.flat()
  }, [listPollQuery.data])
  const renderFeedItem = React.useCallback(({ item }: { item: FeedItem; index: number }) => {
    return <FeedCard key={item.id} feedItem={item} className="mt-3 mx-4" />
  }, [])
  const onEndReached = React.useCallback(() => {
    if (listPollQuery.hasNextPage && !listPollQuery.isFetchingNextPage) {
      listPollQuery.fetchNextPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listPollQuery.fetchNextPage, listPollQuery.hasNextPage, listPollQuery.isFetchingNextPage])

  const queryClient = useQueryClient()
  const onRefresh = React.useCallback(async () => {
    await queryClient.resetQueries({ queryKey: [QUERY_KEY_SYMBOL, 'infinite', 'polls'] })
    await queryClient.invalidateQueries({ queryKey: useRecentActivityQuery.getKey() })
  }, [queryClient])

  const flatListRef = React.useRef<Animated.FlatList<any>>(null)
  useBottomTabOnPress(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
  })
  return (
    <Animated.FlatList
      ref={flatListRef}
      className="flex-1"
      contentContainerClassName="flex flex-col bg-base-bg-default flex-grow mb-4"
      refreshControl={<RefreshControl onRefresh={onRefresh} />}
      ListHeaderComponent={
        <>
          {props.ListHeaderComponent}
          {!!session && (
            <View className="flex flex-row justify-between items-center px-4 pt-4">
              <View className="flex flex-row gap-2 items-center">
                <Icon icon={ListTodoIcon} className="size-8 text-base-primary-default" />
                <H2 className="text-2xl text-base-text-high font-heading-semibold">แบบสอบถาม</H2>
              </View>
              {/* <Link asChild href="/poll/feed">
              <Button variant="ghost">
              <Text>ดูทั้งหมด</Text>
              <Icon icon={ArrowRightIcon} />
              </Button>
              </Link> */}
            </View>
          )}
        </>
      }
      data={data}
      renderItem={renderFeedItem}
      onEndReached={onEndReached}
      ListFooterComponent={
        session ? <PollFooter queryResult={listPollQuery} className="mx-4" /> : undefined
      }
    />
  )
}

interface PollFooterProps {
  queryResult: UseInfiniteQueryResult<InfiniteData<unknown[]>>
  className?: string
}
export function PollFooter({ queryResult, className }: PollFooterProps) {
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
      <View className="flex flex-col items-center justify-center py-6">
        <Text className="text-base-text-medium font-heading-semibold">ยังไม่มีแบบสอบถาม</Text>
      </View>
    )
  }
  // Reach end of feed
  return (
    <View className="flex flex-col items-center justify-center py-6">
      <Text className="text-base-text-medium font-heading-semibold">ไม่มีแบบสอบถามเพิ่มเติม</Text>
    </View>
  )
}
