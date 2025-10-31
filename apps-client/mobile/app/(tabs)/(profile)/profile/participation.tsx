import React from 'react'
import { Dimensions, View } from 'react-native'
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated'

import { ExtractBodyResponse } from '@pple-today/api-client'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { H1 } from '@pple-today/ui/typography'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ArrowLeftIcon, HandIcon } from 'lucide-react-native'

import { ApplicationApiSchema } from '@api/backoffice/app'
import { Participation } from '@app/app/(tabs)/(profile)/profile/index'
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

const minHeight = Dimensions.get('window').height
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

  const feedInfiniteQuery = useInfiniteQuery({
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

  type GetUserPollParticipationResponse = ExtractBodyResponse<
    ApplicationApiSchema,
    'get',
    '/profile/participation/poll'
  >
  const data = React.useMemo((): GetUserPollParticipationResponse['items'] => {
    if (!feedInfiniteQuery.data) return []
    return feedInfiniteQuery.data.pages.flatMap((page) => page.items)
  }, [feedInfiniteQuery.data])

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
      contentContainerClassName="flex-grow flex flex-col gap-4 my-2"
      contentContainerStyle={{ paddingTop: headerHeight, minHeight: minHeight }}
      onEndReachedThreshold={1}
      onEndReached={onEndReached}
      renderItem={renderParticipationItem}
      showsVerticalScrollIndicator={false}
    />
  )
}

const MyElectionContent = (props: PagerScrollViewProps) => {
  return null
}
