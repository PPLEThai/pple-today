import * as React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ExtractBodyResponse } from '@pple-today/api-client'
import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { BottomSheetModal, BottomSheetScrollView } from '@pple-today/ui/bottom-sheet/index'
import { Button } from '@pple-today/ui/button'
import { FormItem, FormLabel, FormMessage } from '@pple-today/ui/form'
import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Skeleton } from '@pple-today/ui/skeleton'
import { Slide, SlideIndicators, SlideItem, SlideScrollView } from '@pple-today/ui/slide'
import { Text } from '@pple-today/ui/text'
import { toast } from '@pple-today/ui/toast'
import { toggleTextVariants, toggleVariants } from '@pple-today/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@pple-today/ui/toggle-group'
import { H2, H3 } from '@pple-today/ui/typography'
import { useForm } from '@tanstack/react-form'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { Image } from 'expo-image'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { ArrowRightIcon, CirclePlusIcon, MegaphoneIcon, RadioTowerIcon } from 'lucide-react-native'
import { z } from 'zod/v4'

import type {
  ApplicationApiSchema,
  GetBannersResponse,
  GetMyFeedResponse,
  ListCursorResponse,
} from '@api/backoffice/app'
import PPLEIcon from '@app/assets/pple-icon.svg'
import { UserAddressInfoSection } from '@app/components/address-info'
import { AnnouncementCard, AnnouncementCardSkeleton } from '@app/components/announcement'
import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { ElectionCard } from '@app/components/election/election-card'
import { FeedFooter, FeedRefreshControl } from '@app/components/feed'
import { FeedCard } from '@app/components/feed/feed-card'
import { TopicSuggestion } from '@app/components/feed/topic-card'
import { UserSuggestion } from '@app/components/feed/user-card'
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
import { environment } from '@app/env'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'
import { useAuthMe, useSession } from '@app/libs/auth'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'
import { useScrollContext } from '@app/libs/scroll-context'

export default function FeedPage() {
  return (
    <SafeAreaLayout>
      <Pager>
        <PagerHeader>
          <PagerHeaderOnly>
            <MainHeader />
            <View className="flex flex-col w-full bg-base-bg-white">
              <BannerSection />
              <EventSection />
              <UserAddressInfoSection className="pt-4" />
            </View>
            <View className="px-4 bg-base-bg-white flex flex-row items-start pt-6">
              <H2 className="text-3xl font-heading-bold text-base-text-high">ประชาชนวันนี้</H2>
            </View>
          </PagerHeaderOnly>
          <PagerTabBar>
            <SelectTopicButton />
            <PagerTabBarItem index={0}>สำหรับคุณ</PagerTabBarItem>
            <PagerTopicTabBarItems />
            <PagerTabBarItemIndicator />
          </PagerTabBar>
        </PagerHeader>
        <PagerContents />
      </Pager>
    </SafeAreaLayout>
  )
}

function PagerContents() {
  const session = useSession()
  const followTopicsQuery = reactQueryClient.useQuery('/topics/follows', {}, { enabled: !!session })
  return (
    <PagerContentView>
      <View key={0}>
        <PagerContent index={0}>{(props) => <FeedContent {...props} />}</PagerContent>
      </View>
      {session && (
        <View key={1}>
          <PagerContent index={1}>{(props) => <FeedFollowingContent {...props} />}</PagerContent>
        </View>
      )}
      {followTopicsQuery.data
        ? followTopicsQuery.data.map((topic, index) => (
            <View key={index + 2}>
              <PagerContent index={index + 2}>
                {(props) => <FeedTopicContent {...props} topicId={topic.id} />}
              </PagerContent>
            </View>
          ))
        : null}
    </PagerContentView>
  )
}

function MainHeader() {
  const router = useRouter()
  const authMe = useAuthMe()
  const headings = authMe.data
    ? { welcome: 'ยินดีต้อนรับ', title: authMe.data.name }
    : { welcome: 'ยินดีต้อนรับสู่', title: 'PPLE Today' }
  return (
    <View className="w-full px-4 pt-4 pb-2 flex flex-row justify-between gap-2 bg-base-bg-white border-b border-base-outline-default ">
      <View className="flex flex-row items-center gap-3 flex-1">
        <Pressable
          className="w-10 h-10 flex flex-col items-center justify-center"
          onPress={() => {
            if (
              environment.EXPO_PUBLIC_APP_ENVIRONMENT === 'development' ||
              environment.EXPO_PUBLIC_APP_ENVIRONMENT === 'local'
            )
              router.navigate('/playground')
          }}
        >
          <PPLEIcon width={35} height={30} />
        </Pressable>
        <View className="flex flex-col flex-1">
          {authMe.isLoading ? (
            <>
              <Skeleton className="h-3 mt-1 rounded-full w-[80px]" />
              <Skeleton className="h-6 mt-2 rounded-full w-[150px]" />
            </>
          ) : (
            <View className="flex-1 pr-4">
              <Text className="font-heading-regular text-xs">{headings.welcome}</Text>
              <Text className="font-heading-bold text-2xl text-base-primary-default line-clamp-1">
                {headings.title}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View className="flex flex-row gap-4">
        {/* TODO: Notification system */}
        {/* <Button variant="secondary" size="icon" aria-label="Notifications">
          <Icon icon={BellIcon} size={20} className="fill-base-secondary-default" />
        </Button> */}
        <Button
          size="icon"
          aria-label="Profile Settings"
          className="overflow-hidden"
          onPress={() => {
            router.navigate('/profile')
          }}
        >
          <Avatar alt={authMe.data?.name ?? ''} className="size-full rounded-none">
            <AvatarImage source={{ uri: authMe.data?.profileImage }} />
            <AvatarPPLEFallback />
          </Avatar>
        </Button>
      </View>
    </View>
  )
}

const PLACEHOLDER_BANNERS: GetBannersResponse = [
  {
    id: '1',
    imageUrl: '',
    destination: '',
    navigation: 'IN_APP_NAVIGATION',
  },
  {
    id: '2',
    imageUrl: '',
    destination: '',
    navigation: 'IN_APP_NAVIGATION',
  },
]

function BannerSection() {
  const bannersQuery = reactQueryClient.useQuery('/banners', {})
  // Loading : assuming that there are usually 2 or more banners
  const banners = bannersQuery.data ?? PLACEHOLDER_BANNERS
  React.useEffect(() => {
    if (bannersQuery.error) {
      console.error('Banner Query Error', bannersQuery.error)
    }
  }, [bannersQuery.error])
  if (banners.length === 0) return null
  return (
    <Slide
      isLoading={bannersQuery.isLoading}
      count={banners.length}
      itemWidth={320}
      gap={8}
      paddingHorizontal={16}
      className="w-full pt-2"
    >
      <SlideScrollView>
        {banners.map((banner) => (
          <Banner key={banner.id} banner={banner} />
        ))}
      </SlideScrollView>
      <SlideIndicators />
    </Slide>
  )
}

function Banner({ banner }: { banner: GetBannersResponse[number] }) {
  const onPress = () => {
    switch (banner.navigation) {
      case 'IN_APP_NAVIGATION': // use deeplink scheme like 'pple-today:///auth'
      case 'EXTERNAL_BROWSER':
        Linking.openURL(banner.destination)
        break
      case 'MINI_APP':
        WebBrowser.openBrowserAsync(banner.destination)
        break
      default:
        return exhaustiveGuard(banner.navigation)
    }
  }
  const opacity = useSharedValue(1)
  const scale = useSharedValue(1)
  const disabled = !banner.destination
  const fadeIn = () => {
    if (disabled) return
    opacity.value = withTiming(0.9, { duration: 150 })
    scale.value = withTiming(0.98, { duration: 150 })
  }
  const fadeOut = () => {
    if (disabled) return
    opacity.value = withTiming(1, { duration: 150 })
    scale.value = withTiming(1, { duration: 150 })
  }

  return (
    <SlideItem key={banner.id}>
      <Pressable onPressIn={fadeIn} onPressOut={fadeOut} onPress={onPress} disabled={disabled}>
        <Animated.View
          style={{ opacity, transform: [{ scale }] }}
          className="bg-base-bg-light rounded-xl overflow-hidden"
        >
          <Image
            // alt={props.item.description}
            source={banner.imageUrl}
            // placeholder={{ blurhash }}
            style={{ width: 320, height: 180 }}
            contentFit="cover"
            transition={300}
          />
        </Animated.View>
      </Pressable>
    </SlideItem>
  )
}

// const blurhash =
//   '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj['

function EventSection() {
  const session = useSession()
  const electionsQuery = reactQueryClient.useQuery(
    '/elections',
    { query: { in: 'OFFICIAL' } },
    { enabled: !!session }
  )
  const elections = electionsQuery.data || []
  if (elections.length === 0) {
    return null
  }
  return (
    <View className="flex flex-col items-center justify-center gap-2 pt-4">
      <View className="flex flex-row gap-2 justify-start items-center w-full px-4">
        <Icon icon={RadioTowerIcon} size={24} className="text-base-primary-default" />
        <H2 className="text-xl font-heading-bold text-base-text-high">อิเวนต์ตอนนี้</H2>
      </View>
      <Slide
        isLoading={electionsQuery.isLoading}
        count={elections.length}
        itemWidth="container"
        gap={8}
        paddingHorizontal={16}
      >
        <SlideScrollView>
          {elections.map((election) => (
            <SlideItem key={election.id}>
              <ElectionCard election={election} className="flex-1" />
            </SlideItem>
          ))}
        </SlideScrollView>
        <SlideIndicators />
      </Slide>
    </View>
  )
}

function PagerTopicTabBarItems() {
  const session = useSession()
  const followTopicsQuery = reactQueryClient.useQuery('/topics/follows', {}, { enabled: !!session })
  return (
    <>
      {session && <PagerTabBarItem index={1}>กำลังติดตาม</PagerTabBarItem>}
      {followTopicsQuery.data?.map((topic, index) => (
        <PagerTabBarItem index={2 + index} key={2 + index}>
          {topic.name}
        </PagerTabBarItem>
      ))}
    </>
  )
}

function SelectTopicButton() {
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null)
  const router = useRouter()
  const session = useSession()
  const onOpen = () => {
    if (!session) {
      router.navigate('/profile')
      return
    }
    bottomSheetModalRef.current?.present()
  }
  const onClose = () => {
    bottomSheetModalRef.current?.dismiss()
  }
  const insets = useSafeAreaInsets()
  return (
    <>
      <Button
        variant="ghost"
        aria-label="เลือกหัวข้อ"
        className="mb-px"
        size="icon"
        onPress={onOpen}
      >
        <Icon
          icon={CirclePlusIcon}
          strokeWidth={1}
          className="text-base-secondary-default"
          size={24}
        />
      </Button>

      <BottomSheetModal
        ref={bottomSheetModalRef}
        bottomInset={insets.bottom}
        topInset={insets.top}
        enableDynamicSizing
      >
        <SelectTopicForm onClose={onClose} />
      </BottomSheetModal>
    </>
  )
}

const formSchema = z.object({
  topicId: z.string().min(1, 'กรุณาเลือกหัวข้อ 1 หัวข้อ'),
})

const SelectTopicForm = (props: { onClose: () => void }) => {
  const listTopicQuery = reactQueryClient.useQuery('/topics/list', {})
  const followTopicMutation = reactQueryClient.useMutation('post', '/topics/:topicId/follow', {})
  const queryClient = useQueryClient()
  const form = useForm({
    defaultValues: {
      topicId: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      followTopicMutation.mutateAsync(
        { pathParams: { topicId: value.topicId } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: reactQueryClient.getQueryKey('/topics/follows'),
            })
            queryClient.invalidateQueries({
              queryKey: reactQueryClient.getQueryKey('/topics/list'),
            })
            props.onClose()
          },
          onError: (error) => {
            console.error('Follow topic error:', error)
            toast.error({ text1: 'เกิดข้อผิดพลาดบางอย่าง' })
          },
        }
      )
    },
  })
  const onSkip = () => {
    props.onClose()
  }
  return (
    <BottomSheetScrollView>
      <View className="flex flex-col gap-1 p-4 pb-0">
        <Text className="text-2xl font-heading-bold">เลือกหัวข้อที่สนใจ</Text>
        <Text className="text-sm font-heading-regular text-base-text-medium">
          เลือก 1 หัวข้อสำหรับเพิ่มลงบนหน้าแรก
        </Text>
      </View>
      <form.Field name="topicId">
        {(field) => (
          <FormItem field={field} className="p-4">
            <FormLabel style={[StyleSheet.absoluteFill, { opacity: 0, pointerEvents: 'none' }]}>
              ความคิดเห็น
            </FormLabel>
            <ToggleGroup
              type="single"
              value={field.state.value}
              onValueChange={(value) => {
                field.handleChange(value!)
              }}
              className="bg-base-bg-light rounded-lg border border-base-outline-default flex flex-row flex-wrap gap-2 justify-start p-2"
            >
              {listTopicQuery.isLoading || !listTopicQuery.data ? (
                <TopicSkeleton />
              ) : listTopicQuery.data.length === 0 ? (
                <View className="w-full items-center justify-center py-14">
                  <Text className="text-base-text-placeholder font-heading-semibold">
                    ยังไม่มีหัวข้อ
                  </Text>
                </View>
              ) : (
                listTopicQuery.data?.map((tag) => {
                  if (tag.followed)
                    return (
                      <View
                        key={tag.id}
                        className={cn(
                          toggleVariants(),
                          'bg-base-primary-default active:bg-base-primary-medium web:hover:bg-base-primary-medium border-base-primary-default'
                        )}
                      >
                        <Text className={cn(toggleTextVariants(), 'text-base-text-invert')}>
                          {tag.name}
                        </Text>
                      </View>
                    )
                  return (
                    <ToggleGroupItem key={tag.id} value={tag.id} variant="outline">
                      <Text>{tag.name}</Text>
                    </ToggleGroupItem>
                  )
                })
              )}
            </ToggleGroup>
            <FormMessage />
          </FormItem>
        )}
      </form.Field>
      {/* TODO: make sticky and set max height, might use BottomSheetFooter */}
      <View className="flex flex-col gap-2 px-4 py-2 bg-base-bg-white">
        <form.Subscribe selector={(state) => [state.isSubmitting]}>
          {([isSubmitting]) => (
            <Button
              onPress={form.handleSubmit}
              disabled={isSubmitting || followTopicMutation.isPending}
            >
              <Text>ตกลง</Text>
            </Button>
          )}
        </form.Subscribe>
        <Button variant="ghost" onPress={onSkip} disabled={followTopicMutation.isPending}>
          <Text>ยกเลิก</Text>
        </Button>
      </View>
    </BottomSheetScrollView>
  )
}

const TopicSkeleton = () => {
  return (
    <>
      <Skeleton className="rounded-full h-10 w-20" />
      <Skeleton className="rounded-full h-10 w-16" />
      <Skeleton className="rounded-full h-10 w-18" />
      <Skeleton className="rounded-full h-10 w-16" />
      <Skeleton className="rounded-full h-10 w-20" />
      <Skeleton className="rounded-full h-10 w-24" />
      <Skeleton className="rounded-full h-10 w-20" />
      <Skeleton className="rounded-full h-10 w-24" />
      <Skeleton className="rounded-full h-10 w-24" />
      <Skeleton className="rounded-full h-10 w-20" />
      <Skeleton className="rounded-full h-10 w-16" />
      <Skeleton className="rounded-full h-10 w-18" />
      <Skeleton className="rounded-full h-10 w-16" />
    </>
  )
}

function FeedFollowingContent(props: PagerScrollViewProps) {
  const { headerHeight, scrollElRef } = props

  const feedInfiniteQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/feed/following'),
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/feed/following', {
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

  type GetMyFeedResponse = ExtractBodyResponse<ApplicationApiSchema, 'get', '/feed/me'>
  const data = React.useMemo((): GetMyFeedResponse['items'] => {
    if (!feedInfiniteQuery.data) return []
    return feedInfiniteQuery.data.pages.flatMap((page) => page.items)
  }, [feedInfiniteQuery.data])

  const scrollContext = useScrollContext()
  const scrollHandler = useAnimatedScrollHandler(scrollContext)

  const queryClient = useQueryClient()
  const onRefresh = React.useCallback(async () => {
    await Promise.all([
      queryClient.resetQueries({
        queryKey: reactQueryClient.getQueryKey('/feed/following'),
      }),
    ])
    await feedInfiniteQuery.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, feedInfiniteQuery.refetch])

  const renderFeedItem = React.useCallback(
    ({ item }: { item: GetMyFeedResponse['items'][number]; index: number }) => {
      return <FeedCard key={item.id} feedItem={item} className="mt-4 mx-4" />
    },
    []
  )

  return (
    <Animated.FlatList
      ref={scrollElRef}
      onScroll={scrollHandler}
      refreshControl={<FeedRefreshControl headerHeight={headerHeight} onRefresh={onRefresh} />}
      data={data}
      className="flex-1"
      contentContainerClassName="py-4 flex flex-col bg-base-bg-default"
      contentContainerStyle={{ paddingTop: headerHeight }}
      ListFooterComponent={<FeedFooter queryResult={feedInfiniteQuery} className="mt-4 mx-4" />}
      onEndReachedThreshold={1}
      onEndReached={onEndReached}
      renderItem={renderFeedItem}
      showsVerticalScrollIndicator={false}
    />
  )
}

const LIMIT = 10
function FeedContent(props: PagerScrollViewProps) {
  const { headerHeight, scrollElRef } = props

  type MyFeedItem = GetMyFeedResponse['items'][number] | { type: 'SUGGESTION' }
  const feedInfiniteQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/feed/me'),
    queryFn: async ({ pageParam }): Promise<ListCursorResponse<MyFeedItem>> => {
      const response = await fetchClient('/feed/me', {
        query: { cursor: pageParam, limit: LIMIT },
      })
      if (response.error) {
        throw response.error
      }
      if (pageParam === '') {
        // insert suggestion after first 2 posts
        const newItems: MyFeedItem[] = [...response.data.items]
        newItems.splice(2, 0, { type: 'SUGGESTION' })

        return {
          items: newItems,
          meta: response.data.meta,
        }
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

  const data = React.useMemo((): MyFeedItem[] => {
    if (!feedInfiniteQuery.data) return []
    return feedInfiniteQuery.data.pages.flatMap((page) => page.items)
  }, [feedInfiniteQuery.data])

  const scrollContext = useScrollContext()
  const scrollHandler = useAnimatedScrollHandler(scrollContext)

  const queryClient = useQueryClient()
  const onRefresh = React.useCallback(async () => {
    // invalidate all 'get' queries
    queryClient.invalidateQueries({ queryKey: reactQueryClient.getKey('get') })
    await Promise.all([
      queryClient.resetQueries({ queryKey: reactQueryClient.getQueryKey('/feed/me') }),
      queryClient.resetQueries({ queryKey: reactQueryClient.getQueryKey('/announcements') }),
    ])
    await feedInfiniteQuery.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, feedInfiniteQuery.refetch])

  const renderFeedItem = React.useCallback(({ item }: { item: MyFeedItem; index: number }) => {
    if (item.type === 'SUGGESTION') {
      return (
        <>
          <UserSuggestion />
          <TopicSuggestion />
        </>
      )
    }
    return <FeedCard key={item.id} feedItem={item} className="mt-4 mx-4" />
  }, [])

  return (
    <Animated.FlatList
      ref={scrollElRef}
      onScroll={scrollHandler}
      refreshControl={<FeedRefreshControl headerHeight={headerHeight} onRefresh={onRefresh} />}
      data={data}
      className="flex-1"
      contentContainerClassName="py-4 flex flex-col bg-base-bg-default"
      contentContainerStyle={{ paddingTop: headerHeight }}
      ListHeaderComponent={<AnnouncementSection />}
      ListFooterComponent={<FeedFooter queryResult={feedInfiniteQuery} className="mt-4 mx-4" />}
      onEndReachedThreshold={1}
      onEndReached={onEndReached}
      renderItem={renderFeedItem}
      showsVerticalScrollIndicator={false}
    />
  )
}

interface FeedTopicContentProps extends PagerScrollViewProps {
  topicId: string
}

function FeedTopicContent(props: FeedTopicContentProps) {
  const { headerHeight, scrollElRef, topicId } = props

  const feedInfiniteQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/feed/topic', { query: { topicId } }),
    queryFn: async ({ pageParam }) => {
      const response = await fetchClient('/feed/topic', {
        query: { cursor: pageParam, limit: LIMIT, topicId },
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

  type GetMyFeedResponse = ExtractBodyResponse<ApplicationApiSchema, 'get', '/feed/me'>
  const data = React.useMemo((): GetMyFeedResponse['items'] => {
    if (!feedInfiniteQuery.data) return []
    return feedInfiniteQuery.data.pages.flatMap((page) => page.items)
  }, [feedInfiniteQuery.data])

  const scrollContext = useScrollContext()
  const scrollHandler = useAnimatedScrollHandler(scrollContext)

  const queryClient = useQueryClient()
  const onRefresh = React.useCallback(async () => {
    await Promise.all([
      queryClient.resetQueries({
        queryKey: reactQueryClient.getQueryKey('/feed/topic', { query: { topicId } }),
      }),
    ])
    await feedInfiniteQuery.refetch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, topicId, feedInfiniteQuery.refetch])

  const renderFeedItem = React.useCallback(
    ({ item }: { item: GetMyFeedResponse['items'][number]; index: number }) => {
      return <FeedCard key={item.id} feedItem={item} className="mt-4 mx-4" />
    },
    []
  )

  return (
    <Animated.FlatList
      ref={scrollElRef}
      onScroll={scrollHandler}
      refreshControl={<FeedRefreshControl headerHeight={headerHeight} onRefresh={onRefresh} />}
      data={data}
      className="flex-1"
      contentContainerClassName="py-4 flex flex-col bg-base-bg-default"
      contentContainerStyle={{ paddingTop: headerHeight }}
      ListFooterComponent={<FeedFooter queryResult={feedInfiniteQuery} className="mt-4 mx-4" />}
      onEndReachedThreshold={1}
      onEndReached={onEndReached}
      renderItem={renderFeedItem}
      showsVerticalScrollIndicator={false}
    />
  )
}

function AnnouncementSection() {
  const announcementsQuery = reactQueryClient.useQuery('/announcements', {
    query: { limit: 5 },
  })
  const router = useRouter()

  if (announcementsQuery.isLoading) {
    return (
      <View className="flex flex-col">
        <View className="flex flex-row pt-4 px-4 pb-3 justify-between">
          <View className="flex flex-row items-center gap-2">
            <Icon
              icon={MegaphoneIcon}
              className="color-base-primary-default"
              width={32}
              height={32}
            />
            <H3 className="text-base-text-high font-heading-semibold text-2xl">ประกาศ</H3>
          </View>
          <View className="min-h-10 bg-base-bg-default rounded-lg" />
        </View>
        <Slide count={3} itemWidth={320} gap={8} paddingHorizontal={16} isLoading>
          <SlideScrollView>
            <SlideItem>
              <AnnouncementCardSkeleton />
            </SlideItem>
            <SlideItem>
              <AnnouncementCardSkeleton />
            </SlideItem>
            <SlideItem>
              <AnnouncementCardSkeleton />
            </SlideItem>
          </SlideScrollView>
          <SlideIndicators />
        </Slide>
      </View>
    )
  }

  if (!announcementsQuery.data) return null
  const announcements = announcementsQuery.data.announcements
  if (announcements.length === 0) return null
  return (
    <View className="flex flex-col">
      <View className="flex flex-row pt-4 px-4 pb-3 justify-between">
        <View className="flex flex-row items-center gap-2">
          <Icon
            icon={MegaphoneIcon}
            className="color-base-primary-default"
            width={32}
            height={32}
          />
          <H3 className="text-base-text-high font-heading-semibold text-2xl">ประกาศ</H3>
        </View>
        <Button variant="ghost" onPress={() => router.navigate('/announcement')}>
          <Text>ดูเพิ่มเติม</Text>
          <Icon icon={ArrowRightIcon} strokeWidth={2} />
        </Button>
      </View>
      <Slide count={announcements.length} itemWidth={320} gap={8} paddingHorizontal={16}>
        <SlideScrollView>
          {announcements.map((announcement) => (
            <SlideItem key={announcement.id}>
              <AnnouncementCard
                id={announcement.id}
                onPress={() => router.navigate(`/announcement/${announcement.id}`)}
                feedId={announcement.id}
                title={announcement.title}
                date={announcement.publishedAt.toString()}
                type={announcement.type}
              />
            </SlideItem>
          ))}
        </SlideScrollView>
        <SlideIndicators />
      </Slide>
    </View>
  )
}
