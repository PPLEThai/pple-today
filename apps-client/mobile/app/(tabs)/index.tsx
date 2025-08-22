import * as React from 'react'
import { findNodeHandle, Pressable, View } from 'react-native'
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated'

import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Slide, SlideIndicators, SlideItem, SlideScrollView } from '@pple-today/ui/slide'
import { Text } from '@pple-today/ui/text'
import { H2, H3 } from '@pple-today/ui/typography'
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
import PPLEIcon from '@app/assets/pple-icon.svg'
import { AnnouncementCard } from '@app/components/announcement'
import { PostCard } from '@app/components/feed/post-card'
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
import { useAuthMe, useSessionQuery } from '@app/libs/auth'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'
import { queryClient } from '@app/libs/react-query'

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
    <View className="w-full px-4 pt-10 pb-2 flex flex-row justify-between gap-2 bg-base-bg-white border-b border-base-outline-default ">
      <View className="flex flex-row items-center gap-3">
        <Pressable
          className="w-10 h-10 flex flex-col items-center justify-center"
          onPress={() => {
            if (
              environment.APP_ENVIRONMENT === 'development' ||
              environment.APP_ENVIRONMENT === 'local'
            )
              router.navigate('/(tabs)/(top-tabs)/playground')
          }}
        >
          <PPLEIcon width={35} height={30} />
        </Pressable>
        <View className="flex flex-col">
          <Text className="font-anakotmai-light text-xs">{headings.welcome}</Text>
          <Text className="font-anakotmai-bold text-2xl text-base-primary-default">
            {headings.title}
          </Text>
        </View>
      </View>
      <View className="flex flex-row gap-4">
        {/* TODO: Notification system */}
        {/* <Button variant="secondary" size="icon" aria-label="Notifications">
          <Icon icon={BellIcon} size={20} className="fill-base-secondary-default" />
        </Button> */}
        {/* TODO: avatar or profile picture */}
        <Button
          size="icon"
          aria-label="Profile Settings"
          onPress={() => {
            router.push('/auth')
          }}
        >
          <Icon icon={PPLEIcon} width={20} height={20} color="white" />
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
  const bannersQuery = queryClient.useQuery('/banners', {})
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
  const sessionQuery = useSessionQuery()
  const authMeQuery = queryClient.useQuery(
    '/auth/me',
    { headers: { Authorization: sessionQuery.data?.accessToken } },
    { enabled: !!sessionQuery.data?.accessToken }
  )
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

interface FeedContentProps extends PagerScrollViewProps {}
function FeedContent(props: FeedContentProps) {
  const { headerHeight, isFocused, scrollElRef, scrollHandler, setScrollViewTag } = props
  React.useEffect(() => {
    if (isFocused && scrollElRef.current) {
      const scrollViewTag = findNodeHandle(scrollElRef.current)
      setScrollViewTag(scrollViewTag)
      // console.log('scrollViewTag:', scrollViewTag)
    }
  }, [isFocused, scrollElRef, setScrollViewTag])
  const feedQuery = queryClient.useQuery('/feed/me', { query: { limit: 10 } })
  // React.useEffect(() => {
  //   console.log(feedQuery.data)
  // }, [feedQuery.data])
  // TODO: loading state
  // TODO: empty state
  // TODO: error state
  return (
    // TODO: use flashlist
    <Animated.FlatList
      ref={scrollElRef}
      onScroll={scrollHandler}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: headerHeight }}
      // contentOffset={{ x: 0, y: -headerHeight }}
      // scrollIndicatorInsets={{ top: headerHeight, right: 1 }}
      // automaticallyAdjustsScrollIndicatorInsets={false}
      data={feedQuery.data ?? []}
      contentContainerClassName="py-4 flex flex-col"
      ListHeaderComponent={<AnnouncementSection />}
      renderItem={({ item }) => {
        switch (item.type) {
          case 'POST':
            return (
              <PostCard
                key={item.id}
                author={item.author}
                attachments={
                  item.post.attachments?.map((attachment) => {
                    switch (attachment.type) {
                      case 'IMAGE':
                        return {
                          ...attachment,
                          type: 'IMAGE',
                        }
                      case 'VIDEO':
                        return {
                          ...attachment,
                          type: 'VIDEO',
                        }
                      default:
                        throw new Error('There should be only IMAGE or VIDEO attachments')
                    }
                  }) ?? []
                }
                commentCount={item.commentCount}
                content={item.post.content}
                createdAt={item.createdAt.toString()}
                firstImageType="square"
                hashTags={item.post.hashTags}
                reactions={item.reactions.map((reaction) => ({
                  type: reaction.type as 'UP_VOTE' | 'DOWN_VOTE', // TODO: enum this
                  count: reaction.count,
                }))}
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
      }}
    />
  )
}

function AnnouncementSection() {
  const announcementsQuery = queryClient.useQuery('/announcements', {
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
