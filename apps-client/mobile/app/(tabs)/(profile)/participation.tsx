import React from 'react'
import { Dimensions, View } from 'react-native'
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ExtractBodyResponse } from '@pple-today/api-client'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { InfiniteData, useInfiniteQuery, UseInfiniteQueryResult } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ArrowLeftIcon, HandIcon, PackageOpenIcon } from 'lucide-react-native'

import { ApplicationApiSchema, ListCursorResponse } from '@api/backoffice/app'
import { Participation } from '@app/app/(tabs)/(profile)/profile'
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
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { Spinner } from '@app/components/spinner'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'
import { useScrollContext } from '@app/libs/scroll-context'

export default function MyParticipationPage() {
  const router = useRouter()
  return (
    <SafeAreaLayout>
      <Pager>
        <PagerHeader>
          <PagerHeaderOnly>
            <View className="p-4 flex flex-row justify-between items-center bg-base-bg-white border-b border-base-outline-default">
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
                    icon={HandIcon}
                    size={32}
                    strokeWidth={2}
                    className="text-base-primary-default"
                  />
                  <H1 className="text-3xl font-heading-semibold text-base-text-high">
                    การเข้าร่วมของฉัน
                  </H1>
                </View>
              </View>
            </View>
          </PagerHeaderOnly>
          <PagerTabBar fullWidth className="border-0">
            <PagerTabBarItem index={0} className="flex-1 border-b border-base-outline-default mt-3">
              แบบสอบถาม
            </PagerTabBarItem>
            <PagerTabBarItem index={1} className="flex-1 border-b border-base-outline-default mt-3">
              การเลือกตั้ง
            </PagerTabBarItem>
            <PagerTabBarItemIndicator />
          </PagerTabBar>
        </PagerHeader>
        <PagerContentView>
          <View key={0}>
            <PagerContent index={0}>{(props) => <MyPollContent {...props} />}</PagerContent>
          </View>
          <View key={1}>
            <PagerContent index={1}>{(props) => <MyElectionContent {...props} />}</PagerContent>
          </View>
        </PagerContentView>
      </Pager>
    </SafeAreaLayout>
  )
}

const LIMIT = 10
const MyPollContent = (props: PagerScrollViewProps) => {
  const { headerHeight, scrollElRef } = props

  const scrollContext = useScrollContext()
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event, ctx) => {
      'worklet'
      scrollContext?.onScroll?.(event, ctx)
    },
  })

  const pollInfiniteQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/profile/participation/poll'),
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/profile/participation/poll', {
        query: { cursor: pageParam, limit: LIMIT },
      })
      if (response.error) {
        throw response.error
      }
      return response.data
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.cursor.next === null) {
        return undefined
      }
      return lastPage.meta.cursor.next
    },
  })
  React.useEffect(() => {
    if (pollInfiniteQuery.error) {
      console.error('Error fetching feed:', JSON.stringify(pollInfiniteQuery.error))
    }
  }, [pollInfiniteQuery.error])

  const onEndReached = React.useCallback(() => {
    if (!pollInfiniteQuery.isFetching && pollInfiniteQuery.hasNextPage) {
      pollInfiniteQuery.fetchNextPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollInfiniteQuery.isFetching, pollInfiniteQuery.hasNextPage, pollInfiniteQuery.fetchNextPage])

  type GetUserPollParticipationResponse = ExtractBodyResponse<
    ApplicationApiSchema,
    'get',
    '/profile/participation/poll'
  >
  const data = React.useMemo((): GetUserPollParticipationResponse['items'] => {
    if (!pollInfiniteQuery.data) return []
    return pollInfiniteQuery.data.pages.flatMap((page) => page.items)
  }, [pollInfiniteQuery.data])

  const renderParticipationItem = React.useCallback(
    ({ item }: { item: GetUserPollParticipationResponse['items'][number]; index: number }) => {
      return <Participation key={item.id} participation={item} />
    },
    []
  )

  return (
    <Animated.FlatList
      ref={scrollElRef}
      onScroll={scrollHandler}
      data={data}
      className="flex-1"
      contentContainerClassName="flex-grow flex flex-col gap-4 my-4"
      contentContainerStyle={{ paddingTop: headerHeight, minHeight: minHeight }}
      onEndReachedThreshold={1}
      onEndReached={onEndReached}
      renderItem={renderParticipationItem}
      ListEmptyComponent={<MyParticipationEmpty queryResult={pollInfiniteQuery} />}
      ListFooterComponent={<MyParticipationFooter queryResult={pollInfiniteQuery} />}
      showsVerticalScrollIndicator={false}
    />
  )
}

const minHeight = Dimensions.get('window').height
const MyElectionContent = (props: PagerScrollViewProps) => {
  const { headerHeight, scrollElRef } = props

  const scrollContext = useScrollContext()
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event, ctx) => {
      'worklet'
      scrollContext?.onScroll?.(event, ctx)
    },
  })

  const electionInfiniteQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/profile/participation/election'),
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/profile/participation/election', {
        query: { cursor: pageParam, limit: LIMIT },
      })
      if (response.error) {
        throw response.error
      }
      return response.data
    },
    initialPageParam: '',
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.cursor.next === null) {
        return undefined
      }
      return lastPage.meta.cursor.next
    },
  })
  React.useEffect(() => {
    if (electionInfiniteQuery.error) {
      console.error('Error fetching feed:', JSON.stringify(electionInfiniteQuery.error))
    }
  }, [electionInfiniteQuery.error])

  const onEndReached = React.useCallback(() => {
    if (!electionInfiniteQuery.isFetching && electionInfiniteQuery.hasNextPage) {
      electionInfiniteQuery.fetchNextPage()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    electionInfiniteQuery.isFetching,
    electionInfiniteQuery.hasNextPage,
    electionInfiniteQuery.fetchNextPage,
  ])

  type GetUserElectionParticipationResponse = ExtractBodyResponse<
    ApplicationApiSchema,
    'get',
    '/profile/participation/election'
  >
  const data = React.useMemo((): GetUserElectionParticipationResponse['items'] => {
    if (!electionInfiniteQuery.data) return []
    return electionInfiniteQuery.data.pages.flatMap((page) => page.items)
  }, [electionInfiniteQuery.data])

  const renderParticipationItem = React.useCallback(
    ({ item }: { item: GetUserElectionParticipationResponse['items'][number]; index: number }) => {
      return <Participation key={item.id} participation={item} />
    },
    []
  )

  return (
    <Animated.FlatList
      ref={scrollElRef}
      onScroll={scrollHandler}
      data={data}
      className="flex-1"
      contentContainerClassName="flex-grow flex flex-col gap-4 mt-4"
      contentContainerStyle={{ minHeight: minHeight, paddingTop: headerHeight }}
      onEndReachedThreshold={1}
      onEndReached={onEndReached}
      renderItem={renderParticipationItem}
      ListEmptyComponent={<MyParticipationEmpty queryResult={electionInfiniteQuery} />}
      ListFooterComponent={<MyParticipationFooter queryResult={electionInfiniteQuery} />}
      showsVerticalScrollIndicator={false}
    />
  )
}

interface MyParticipationEmptyProps {
  queryResult: UseInfiniteQueryResult<InfiniteData<ListCursorResponse<unknown>>>
  className?: string
}
const MyParticipationEmpty = ({ queryResult, className }: MyParticipationEmptyProps) => {
  const inset = useSafeAreaInsets()

  if (queryResult.hasNextPage || queryResult.isLoading || queryResult.error) {
    return null
  }

  return (
    <View
      className={cn(
        'items-center justify-center mx-4 border bg-base-bg-light gap-3 border-base-outline-default rounded-xl flex-1 px-[98px]',
        className
      )}
      style={{ marginBottom: inset.bottom }}
    >
      <Icon icon={PackageOpenIcon} size={64} className="text-base-outline-medium" strokeWidth={1} />
      <Text className="font-heading-regular text-base-text-placeholder items-center text-center">
        ตอบแบบสอบถาม หรือ ลงคะแนนเลือกตั้งเพื่อแสดงข้อมูล
      </Text>
    </View>
  )
}

interface MyParticipationFooterProps {
  queryResult: UseInfiniteQueryResult<InfiniteData<ListCursorResponse<unknown>>>
}
const MyParticipationFooter = ({ queryResult }: MyParticipationFooterProps) => {
  if (queryResult.hasNextPage || queryResult.isLoading || queryResult.error) {
    return (
      <View className="items-center py-16">
        <Spinner />
      </View>
    )
  }

  return null
}
