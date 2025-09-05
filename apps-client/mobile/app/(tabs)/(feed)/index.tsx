import * as React from 'react'
import { findNodeHandle, FlatListComponent, Pressable, View } from 'react-native'
import Animated, {
  FlatListPropsWithLayout,
  useAnimatedScrollHandler,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { Avatar, AvatarImage } from '@pple-today/ui/avatar'
import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Slide, SlideIndicators, SlideItem, SlideScrollView } from '@pple-today/ui/slide'
import { Text } from '@pple-today/ui/text'
import { H2, H3 } from '@pple-today/ui/typography'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import {
  ArrowRightIcon,
  CirclePlusIcon,
  ClockIcon,
  ContactRoundIcon,
  MapPinIcon,
  MapPinnedIcon,
  MegaphoneIcon,
  RadioTowerIcon,
} from 'lucide-react-native'

import { GetBannersResponse } from '@api/backoffice/src/modules/banner/models'
import { GetMyFeedResponse } from '@api/backoffice/src/modules/feed/models'
import PPLEIcon from '@app/assets/pple-icon.svg'
import { AnnouncementCard } from '@app/components/announcement'
import { AvatarPPLEFallback } from '@app/components/avatar-pple-fallback'
import { PostCard, PostCardSkeleton } from '@app/components/feed/post-card'
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
import { environment } from '@app/env'
import { fetchClient, reactQueryClient } from '@app/libs/api-client'
import { useAuthMe } from '@app/libs/auth'
import { getAuthSession } from '@app/libs/auth/session'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'
import { useScrollContext } from '@app/libs/scroll-context'

export default function IndexLayout() {
  return (
    <Pager>
      <PagerHeader>
        <PagerHeaderOnly>
          <MainHeader />
          <View className="flex flex-col w-full bg-base-bg-white">
            <BannerSection />
            {/* <EventSection /> */}
            <UserInfoSection />
          </View>
          <View className="px-4 bg-base-bg-white flex flex-row items-start ">
            <H2 className="text-3xl pt-6">ประชาชนวันนี้</H2>
          </View>
        </PagerHeaderOnly>
        <PagerTabBar>
          <Button variant="ghost" aria-label="Add Label" className="mb-px" size="icon">
            <Icon
              icon={CirclePlusIcon}
              strokeWidth={1}
              className="text-base-secondary-default"
              size={24}
            />
          </Button>
          <PagerTabBarItem index={0}>สำหรับคุณ</PagerTabBarItem>
          <PagerTabBarItem index={1}>กำลังติดตาม</PagerTabBarItem>
          <PagerTabBarItem index={2}>กรุงเทพฯ</PagerTabBarItem>
          <PagerTabBarItemIndicator />
        </PagerTabBar>
      </PagerHeader>
      <PagerContentView>
        {Array.from({ length: 3 }).map((_, index) => (
          <View key={index} collapsable={false}>
            <PagerContent index={index}>{(props) => <FeedContent {...props} />}</PagerContent>
          </View>
        ))}
      </PagerContentView>
    </Pager>
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
      <View className="flex flex-row items-center gap-3">
        <Pressable
          className="w-10 h-10 flex flex-col items-center justify-center"
          onPress={() => {
            if (
              environment.EXPO_PUBLIC_APP_ENVIRONMENT === 'development' ||
              environment.EXPO_PUBLIC_APP_ENVIRONMENT === 'local'
            )
              router.navigate('/(tabs)/(top-tabs)/playground')
          }}
        >
          <PPLEIcon width={35} height={30} />
        </Pressable>
        <View className="flex flex-col">
          {authMe.isLoading ? (
            <>
              <View className="h-3 mt-1 bg-base-bg-default rounded-full w-[80px]" />
              <View className="h-6 mt-2 bg-base-bg-default rounded-full w-[150px]" />
            </>
          ) : (
            <>
              <Text className="font-anakotmai-light text-xs">{headings.welcome}</Text>
              <Text className="font-anakotmai-bold text-2xl text-base-primary-default">
                {headings.title}
              </Text>
            </>
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
  if (bannersQuery.error) return null
  return (
    <Slide
      count={banners.length}
      itemWidth={320}
      gap={8}
      paddingHorizontal={16}
      className="w-full pt-2 py-4"
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
  return (
    <View className="flex flex-col items-center justify-center gap-2 px-4 pb-4 ">
      <View className="flex flex-row gap-2 justify-start items-center w-full ">
        <Icon icon={RadioTowerIcon} size={20} className="text-base-primary-default" />
        <H2 className="text-xl font-anakotmai-bold text-base-text-high">อิเวนต์ตอนนี้</H2>
      </View>
      <ElectionCard />
    </View>
  )
}

function ElectionCard() {
  return (
    <View className="w-full bg-base-secondary-default rounded-2xl flex flex-col gap-4 p-4 ">
      <View className="flex flex-col items-start gap-2">
        <Badge variant="secondary">
          <Text>เลือกตั้งในสถานที่</Text>
        </Badge>
        <H3 className="text-base-text-invert font-anakotmai-bold text-lg ">
          เลือกตั้งตัวแทนสมาชิกพรรคประจำ อ.เมือง จ.ระยอง
        </H3>
        <View className="flex flex-col gap-1 ">
          <View className="flex flex-row gap-1 items-center">
            <Icon icon={ClockIcon} size={16} className="text-base-text-invert" />
            <Text className="text-sm text-base-text-invert font-anakotmai-light">
              เวลาที่เหลือ:
            </Text>
            <Text className="text-sm text-base-primary-default font-anakotmai-medium">
              7:46:36 ชั่วโมง
            </Text>
          </View>
          <View className="flex flex-row gap-1 items-center">
            <Icon icon={MapPinIcon} size={16} className="text-base-text-invert" />
            <Text className="text-sm text-base-text-invert font-anakotmai-light">สถานที่:</Text>
            <Text className="text-sm text-base-text-invert font-anakotmai-medium">
              อาคารอเนกประสงชุมชนสองพี่น้อง 1,2,3
            </Text>
          </View>
        </View>
        <View className="flex flex-row gap-2.5">
          <Button className="flex-1" variant="secondary">
            <Icon icon={MapPinnedIcon} />
            <Text>ดูสถานที่</Text>
          </Button>
          <Button className="flex-1" variant="primary">
            <Text>ตรวจสอบสิทธิ์</Text>
            <Icon icon={ArrowRightIcon} />
          </Button>
        </View>
      </View>
    </View>
  )
}

function UserInfoSection() {
  const authMeQuery = useAuthMe()
  // hide when not yet onboarded and therefore no address data
  if (!authMeQuery.data?.address) {
    return null
  }
  return (
    <View className="flex flex-row justify-between items-center w-full px-4">
      <View className="flex flex-col items-start">
        <View className="flex flex-row items-center gap-2">
          <Icon icon={MapPinnedIcon} size={16} className="text-base-primary-medium" />
          <H2 className="text-xs text-base-text-high font-anakotmai-light">พื้นที่ของคุณ</H2>
        </View>
        <Text className="text-lg text-base-primary-default font-anakotmai-bold">
          {authMeQuery.data.address.subDistrict}, {authMeQuery.data.address.district}
        </Text>
        <Text className="text-sm text-base-text-high font-anakotmai-light">
          {authMeQuery.data.address.province}
        </Text>
      </View>
      {/* TODO: style active state & navigate */}
      <Pressable className="flex flex-row items-center gap-3 border border-base-outline-default rounded-2xl p-4">
        <View className="w-8 h-8 flex items-center justify-center rounded-lg bg-base-primary-medium">
          <Icon
            icon={ContactRoundIcon}
            size={24}
            className="text-base-text-invert"
            strokeWidth={1}
          />
        </View>
        <Text className="text-sm text-base-text-high font-anakotmai-medium">
          ดูข้อมูล{'\n'}
          สส. ของคุณ
        </Text>
      </Pressable>
    </View>
  )
}

function FeedContent(props: PagerScrollViewProps) {
  const { headerHeight, isFocused, scrollElRef, setScrollViewTag } = props
  React.useEffect(() => {
    if (isFocused && scrollElRef.current) {
      const scrollViewTag = findNodeHandle(scrollElRef.current)
      setScrollViewTag(scrollViewTag)
      // console.log('scrollViewTag:', scrollViewTag)
    }
  }, [isFocused, scrollElRef, setScrollViewTag])

  const feedInfiniteQuery = useInfiniteQuery({
    queryKey: reactQueryClient.getQueryKey('/feed/me'),
    queryFn: async ({ pageParam }) => {
      const session = await getAuthSession()
      const response = await fetchClient('/feed/me', {
        query: { page: pageParam, limit: 5 },
        headers: session ? { Authorization: `Bearer ${session.accessToken}` } : {},
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

  const data = React.useMemo((): GetMyFeedResponse[] => {
    if (!feedInfiniteQuery.data) return []
    return feedInfiniteQuery.data.pages.filter((page) => !!page)
  }, [feedInfiniteQuery.data])

  const scrollContext = useScrollContext()
  const scrollHandler = useAnimatedScrollHandler(scrollContext)

  const Footer =
    feedInfiniteQuery.hasNextPage || feedInfiniteQuery.isLoading || feedInfiniteQuery.error ? (
      <PostCardSkeleton />
    ) : data.length === 0 ? (
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
    ({ item: items }: { item: GetMyFeedResponse; index: number }) => {
      if (!items) {
        return null
      }
      return (
        <>
          {items.map((item) => {
            switch (item.type) {
              case 'POST':
                return (
                  <PostCard
                    key={item.id}
                    id={item.id}
                    author={item.author}
                    commentCount={item.commentCount}
                    createdAt={item.createdAt.toString()}
                    reactions={item.reactions}
                    userReaction={item.userReaction}
                    post={item.post}
                  />
                )
              case 'POLL':
                // TODO: poll feed card
                return null
              case 'ANNOUNCEMENT':
                // expected no announcement
                return null
              default:
                return exhaustiveGuard(item)
            }
          })}
        </>
      )
    },
    []
  )
  return (
    <FlatListMemo
      // @ts-expect-error FlatListMemo ref type is wrong
      ref={scrollElRef}
      onScroll={scrollHandler}
      headerHeight={headerHeight}
      data={data}
      contentContainerClassName="py-4 flex flex-col"
      ListHeaderComponent={<AnnouncementSection />}
      ListFooterComponent={Footer}
      onEndReachedThreshold={1}
      onEndReached={onEndReached}
      renderItem={renderFeedItem}
    />
  )
}

// https://github.com/bluesky-social/social-app/blob/27c591f031fbe8b3a5837c4ef7082b2ce146a050/src/view/com/util/List.tsx#L19
type FlatListMethods<ItemT = any> = FlatListComponent<ItemT, FlatListPropsWithLayout<ItemT>>
type FlatListProps<ItemT = any> = FlatListPropsWithLayout<ItemT> & {
  headerHeight?: number
}
// TODO: try flashlist
let FlatListMemo = React.forwardRef<FlatListMethods, FlatListProps>(
  function FlatListMemo(props, ref) {
    const {
      onScroll,
      headerHeight,
      data,
      ListHeaderComponent,
      ListFooterComponent,
      onEndReached,
      onEndReachedThreshold,
      renderItem,
      contentContainerClassName,
    } = props
    return (
      <Animated.FlatList
        // @ts-expect-error FlatListMemo ref type is wrong
        ref={ref}
        onScroll={onScroll}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: headerHeight }}
        // contentOffset={{ x: 0, y: -headerHeight }}
        // scrollIndicatorInsets={{ top: headerHeight, right: 1 }}
        // automaticallyAdjustsScrollIndicatorInsets={false}
        data={data}
        contentContainerClassName={contentContainerClassName}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        onEndReachedThreshold={onEndReachedThreshold}
        onEndReached={onEndReached}
        renderItem={renderItem}
      />
    )
  }
)
FlatListMemo = React.memo(FlatListMemo)

function AnnouncementSection() {
  const announcementsQuery = reactQueryClient.useQuery('/announcements', {
    query: { limit: 5 },
  })
  if (!announcementsQuery.data) return null
  // TODO: loading state
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
          <H3 className="text-base-text-high font-anakotmai-medium text-2xl">ประกาศ</H3>
        </View>
        {/* TODO: stack the page */}
        <Button variant="ghost">
          <Text>ดูเพิ่มเติม</Text>
          <Icon icon={ArrowRightIcon} strokeWidth={2} />
        </Button>
      </View>
      <Slide
        count={announcementsQuery.data.announcements.length}
        itemWidth={320}
        gap={8}
        paddingHorizontal={16}
      >
        <SlideScrollView>
          {announcementsQuery.data.announcements.map((announcement) => (
            <SlideItem key={announcement.id}>
              <AnnouncementCard
                title={announcement.title}
                date={announcement.createdAt.toString()}
              />
            </SlideItem>
          ))}
        </SlideScrollView>
        <SlideIndicators />
      </Slide>
    </View>
  )
}
