import React from 'react'
import { View } from 'react-native'
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated'

import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { useRouter } from 'expo-router'
import { ArrowLeftIcon, HandshakeIcon } from 'lucide-react-native'

import {
  ActivityCard,
  ActivityCardProps,
  EXAMPLE_ACTIVITY,
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
import { SafeAreaLayout } from '@app/components/safe-area-layout'
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
          <PagerTabBar widthFull>
            <PagerTabBarItem index={0} className="flex-1 flex-row">
              วันนี้
            </PagerTabBarItem>
            <PagerTabBarItem index={1} className="flex-1 flex-row">
              เร็วๆ นี้
            </PagerTabBarItem>
            <PagerTabBarItemIndicator />
          </PagerTabBar>
        </PagerHeader>
        <PagerContentView>
          <View key={0}>
            <PagerContent index={0}>{(props) => <ActivityContent {...props} />}</PagerContent>
          </View>
          <View key={1}>
            <PagerContent index={1}>{(props) => <ActivityContent {...props} />}</PagerContent>
          </View>
        </PagerContentView>
      </Pager>
    </SafeAreaLayout>
  )
}

function ActivityContent(props: PagerScrollViewProps) {
  const { headerHeight, scrollElRef } = props
  const data: ActivityCardProps['activity'][] = [EXAMPLE_ACTIVITY]

  const scrollContext = useScrollContext()
  const scrollHandler = useAnimatedScrollHandler(scrollContext)

  const renderFeedItem = React.useCallback(
    ({ item }: { item: ActivityCardProps['activity']; index: number }) => {
      return <ActivityCard key={item.id} activity={item} className="mt-3 mx-3" />
    },
    []
  )

  return (
    <Animated.FlatList
      ref={scrollElRef}
      onScroll={scrollHandler}
      // refreshControl={<FeedRefreshControl headerHeight={headerHeight} onRefresh={onRefresh} />}
      data={data}
      className="flex-1 bg-base-bg-default"
      contentContainerClassName="flex flex-col bg-base-bg-default py-4"
      contentContainerStyle={{ paddingTop: headerHeight }}
      // ListFooterComponent={<FeedFooter queryResult={feedInfiniteQuery} className="mt-4 mx-4" />}
      onEndReachedThreshold={1}
      // onEndReached={onEndReached}
      renderItem={renderFeedItem}
      showsVerticalScrollIndicator={false}
    />
  )
}
