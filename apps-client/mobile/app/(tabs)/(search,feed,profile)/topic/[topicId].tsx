import React, { useEffect } from 'react'
import { ScrollView, View } from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@pple-today/ui/dialog'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H1, H2 } from '@pple-today/ui/typography'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { Link, useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeftIcon, CheckIcon, HashIcon, InfoIcon, PlusIcon } from 'lucide-react-native'

import { GetTopicFeedResponse, GetTopicsResponse } from '@api/backoffice/app'
import { FeedFooter } from '@app/components/feed'
import { FeedCard } from '@app/components/feed/feed-card'
import { useTopicFollow } from '@app/components/feed/topic-card'
import { useLightStatusBar } from '@app/context/status-bar'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'
import { useAuthMe } from '@app/libs/auth'

const LIMIT = 10
export default function TopicDetailPage() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const topicId = params.topicId as string
  useEffect(() => {
    if (!topicId) {
      router.dismissTo('/')
    }
  }, [topicId, router])
  const topicQuery = reactQueryClient.useQuery('/topics/:id', {
    pathParams: { id: topicId! },
    enabled: !!topicId,
  })
  const user = useAuthMe()

  const feedInfiniteQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/feed/topic'),
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/feed/topic', {
        query: { cursor: pageParam, limit: LIMIT, topicId: topicId! },
        headers: {},
        body: {},
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
    enabled: !!topicId,
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

  const data = React.useMemo((): GetTopicFeedResponse['items'] => {
    if (!feedInfiniteQuery.data) return []
    return feedInfiniteQuery.data.pages.flatMap((page) => page.items)
  }, [feedInfiniteQuery.data])

  const renderFeedItem = React.useCallback(
    ({ item }: { item: GetTopicFeedResponse['items'][number]; index: number }) => {
      return <FeedCard key={item.id} feedItem={item} className="mt-4 mx-3" />
    },
    []
  )

  const insets = useSafeAreaInsets()
  useLightStatusBar()

  const scrollY = useSharedValue(0)
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y
    },
  })
  const [headerStickyHeight, setHeaderStickyHeight] = React.useState(72 + insets.top)
  const [headerCollapsableHeight, setHeaderCollapsableHeight] = React.useState(96)

  const headerHeight = headerStickyHeight + headerCollapsableHeight
  const imageStyle = useAnimatedStyle(() => {
    return {
      height: Math.max(headerHeight - scrollY.value, headerHeight - headerCollapsableHeight),
    }
  })
  const headerCollapsableStyle = useAnimatedStyle(() => {
    return {
      top: Math.min(0, -scrollY.value) + headerStickyHeight,
      opacity: Math.max(0, 1 - (2 * scrollY.value) / headerCollapsableHeight),
    }
  })
  const linearGradientStyle = useAnimatedStyle(() => {
    return {
      height: Math.max(headerHeight - scrollY.value, headerStickyHeight) - insets.top,
    }
  })
  const [collapsing, setCollapsing] = React.useState(false)
  useAnimatedReaction(
    () => scrollY.value,
    () => {
      if (scrollY.value > 0) {
        runOnJS(setCollapsing)(true)
      } else {
        runOnJS(setCollapsing)(false)
      }
    }
  )

  // Note: assume that user did not follow recommended topic
  const { isFollowing, toggleFollow } = useTopicFollow(topicId!, false)

  const headerTitleHeight = 40
  const headerTitleStyle = useAnimatedStyle(() => {
    return {
      top: Math.max(headerStickyHeight / 2 - scrollY.value, 0),
      opacity: Math.min(
        1,
        Math.max(0, (scrollY.value - headerCollapsableHeight / 2) / headerTitleHeight)
      ),
    }
  })

  if (!topicId) {
    return null
  }
  if (!topicQuery.data) {
    return (
      <View className="flex-1 flex flex-col bg-base-bg-default">
        <View className="absolute top-0 bottom-0 left-0 right-0 bg-gray-800 h-[184px]" />
      </View>
    )
  }
  const topic = topicQuery.data

  const ListHeaderComponent = (
    <View className="flex flex-col gap-3 px-3">
      <View className="rounded-2xl border border-base-outline-default bg-base-bg-white flex flex-col gap-2 p-3">
        <View className="flex flex-row items-center gap-2">
          <Icon icon={InfoIcon} size={24} className="text-base-primary-default" />
          <H2 className="text-base text-base-text-high font-heading-semibold">เกี่ยวกับหัวข้อ</H2>
        </View>
        <Text className="text-sm text-base-text-medium font-body-medium">{topic.description}</Text>
      </View>
      {topic.hashTags.length > 0 && (
        <View className="rounded-2xl border border-base-outline-default bg-base-bg-white flex flex-col gap-2 p-3">
          <View className="flex flex-row items-center gap-2">
            <Icon icon={HashIcon} size={24} className="text-base-primary-default" />
            <H2 className="text-base text-base-text-high font-heading-semibold">ที่เกี่ยวข้อง</H2>
          </View>
          <View className="flex flex-row flex-wrap gap-2">
            {topic.hashTags.slice(0, 4).map((tag) => (
              <Link href={`/hashtag/${tag.id}`} key={tag.id} asChild>
                <Badge variant="outline" className="px-4 py-1.5">
                  <Text className="text-sm text-base-text-high font-heading-semibold">
                    {tag.name}
                  </Text>
                </Badge>
              </Link>
            ))}
            {topic.hashTags.length > 4 && <MoreHashtagDialog hashTags={topic.hashTags} />}
          </View>
        </View>
      )}
    </View>
  )

  return (
    <View className="flex-1 flex flex-col bg-base-bg-default">
      <View
        className="pt-safe z-10"
        onLayout={(e) => setHeaderStickyHeight(e.nativeEvent.layout.height)}
      >
        {topic.bannerImage ? (
          <AnimatedImage
            className="absolute top-0 bottom-0 left-0 right-0 bg-gray-800 overflow-hidden"
            source={{ uri: topic.bannerImage }}
            style={imageStyle}
          />
        ) : (
          <Animated.View
            className="absolute top-0 bottom-0 left-0 right-0 bg-gray-800"
            style={imageStyle}
          />
        )}
        <LinearGradient
          colors={['rgba(0,0,0,1)', 'rgba(0,0,0,0)']}
          className="absolute top-0 left-0 right-0"
          style={{ height: insets.top }}
        />
        <AnimatedLinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,1)']}
          className="absolute top-safe left-0 right-0"
          style={linearGradientStyle}
        />
        <View className="p-4 flex flex-row gap-2">
          <Button
            variant="outline-primary"
            size="icon"
            onPress={() => router.back()}
            aria-label="กลับ"
          >
            <Icon icon={ArrowLeftIcon} size={24} />
          </Button>
          <View className="flex-1">
            <Animated.View
              className="flex flex-row justify-end items-center gap-3 absolute left-0 right-0"
              style={headerTitleStyle}
            >
              <H1 className="text-2xl font-heading-bold text-base-text-invert">{topic.name}</H1>
              <Button
                size="icon"
                variant={isFollowing ? 'outline-primary' : 'primary'}
                disabled={user.data?.isSuspended}
                onPress={toggleFollow}
                aria-label="ติดตาม"
              >
                <Icon icon={isFollowing ? CheckIcon : PlusIcon} size={20} />
              </Button>
            </Animated.View>
          </View>
        </View>
        <Animated.View
          className="flex flex-col px-4 pb-4 gap-2 absolute left-0 right-0"
          pointerEvents={collapsing ? 'none' : 'auto'}
          style={headerCollapsableStyle}
          onLayout={(e) => setHeaderCollapsableHeight(e.nativeEvent.layout.height)}
        >
          <H1 className="text-3xl font-heading-bold text-base-text-invert line-clamp-1">
            {topic.name}
          </H1>
          <Button
            size="sm"
            disabled={user.data?.isSuspended}
            variant={isFollowing ? 'outline-primary' : 'primary'}
            onPress={toggleFollow}
          >
            <Text>{isFollowing ? 'ติดตามแล้ว' : 'ติดตาม'}</Text>
          </Button>
        </Animated.View>
      </View>
      <Animated.FlatList
        onScroll={scrollHandler}
        data={data}
        contentContainerClassName="bg-base-bg-default py-4"
        contentContainerStyle={{ paddingTop: headerCollapsableHeight + 16 }}
        ListHeaderComponent={ListHeaderComponent}
        renderItem={renderFeedItem}
        ListFooterComponent={<FeedFooter queryResult={feedInfiniteQuery} className="mt-4 mx-3" />}
        onEndReached={onEndReached}
        onEndReachedThreshold={1}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const AnimatedImage = Animated.createAnimatedComponent(Image)
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)

interface MoreHashtagDialogProps {
  hashTags: GetTopicsResponse[number]['hashTags']
}
function MoreHashtagDialog({ hashTags }: MoreHashtagDialogProps) {
  const [open, setOpen] = React.useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Badge variant="outline" className="px-4 py-1.5">
          <Text className="text-sm text-base-text-high font-heading-semibold">
            ดูเพิ่มเติม ({hashTags.length - 4})
          </Text>
        </Badge>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="items-start gap-1">
          <DialogTitle className="text-xl font-heading-semibold text-base-primary-default">
            # ที่เกี่ยวข้อง
          </DialogTitle>
          <DialogDescription className="text-sm text-base-text-medium font-heading-regular">
            แฮชแท็กที่เกี่ยวข้องกับหัวข้อนี้
          </DialogDescription>
        </DialogHeader>
        <ScrollView
          contentContainerClassName="flex flex-row p-2 flex-wrap gap-2"
          className="border border-base-outline-default rounded-xl bg-base-bg-light max-h-80"
        >
          {hashTags.map((tag) => (
            <Link href={`/hashtag/${tag.id}`} key={tag.id} asChild onPress={() => setOpen(false)}>
              <Badge variant="outline" className="px-4 py-1.5">
                <Text className="text-sm text-base-text-high font-heading-semibold">
                  {tag.name}
                </Text>
              </Badge>
            </Link>
          ))}
        </ScrollView>
      </DialogContent>
    </Dialog>
  )
}
