import * as React from 'react'
import {
  findNodeHandle,
  LayoutChangeEvent,
  NativeScrollEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { FlatList } from 'react-native-gesture-handler'
import PagerView, {
  PagerViewOnPageScrollEventData,
  PagerViewOnPageSelectedEventData,
  PageScrollStateChangedNativeEventData,
} from 'react-native-pager-view'
import Animated, {
  AnimatedRef,
  EventHandlerProcessed,
  interpolate,
  runOnJS,
  runOnUI,
  ScrollHandlerProcessed,
  scrollTo,
  SharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useEvent,
  useHandler,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

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
  HeartCrackIcon,
  HeartHandshakeIcon,
  MapPinIcon,
  MapPinnedIcon,
  MegaphoneIcon,
  MessageCircleIcon,
  RadioTowerIcon,
  Share2Icon,
} from 'lucide-react-native'

import { GetBannersResponse } from '@api/backoffice/src/modules/banner/models'
import PPLEIcon from '@app/assets/pple-icon.svg'
import { AnnouncementSlides } from '@app/components/announcement'
import { KeyboardAvoidingViewLayout } from '@app/components/keyboard-avoiding-view-layout'
import { environment } from '@app/env'
import { useAuthMe, useSessionQuery } from '@app/libs/auth'
import { exhaustiveGuard } from '@app/libs/exhaustive-guard'
import { queryClient } from '@app/libs/react-query'

import { ExpoScrollForwarderView } from '../../../../packages/expo-scroll-forwarder/build'

export default function IndexLayout() {
  return (
    <KeyboardAvoidingViewLayout>
      <TabViewInsideScroll />
    </KeyboardAvoidingViewLayout>
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

function TopContainer() {
  return (
    <View className="flex flex-col w-full bg-base-bg-white">
      <BannerSection />
      <EventSection />
      <UserInfoSection />
    </View>
  )
}

// assuming there are usually 2 or more banners
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
  const banners = bannersQuery.data ?? PLACEHOLDER_BANNERS
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

// Ref: https://github.com/bluesky-social/social-app/blob/0610c822cf94995c75bbf3237c217b68dabfe5a0/src/view/com/pager/PagerWithHeader.tsx

// brief structure for PagerView with Header
// <Pager>
//   <PagerHeader>
//     <PagerHeaderOnly>...</PagerHeaderOnly>
//     <PagerTabBar>
//       <PagerTab>Tab 1</PagerTab>
//       <PagerTab>Tab 2</PagerTab>
//       <PagerTab>Tab 3</PagerTab>
//       <PagerTabBarItemIndicator />
//     </PagerTabBar>
//   </PagerHeader>
//   <PagerContentView>
//     <View key="1">
//       <PagerContent>...</PagerContent>
//     </View>
//     <View key="2">
//       <PagerContent>...</PagerContent>
//     </View>
//     <View key="3">
//       <PagerContent>...</PagerContent>
//     </View>
//   </PagerContentView>
// </Pager>

export function TabViewInsideScroll() {
  return (
    <Pager>
      <PagerHeader>
        <PagerHeaderOnly>
          <MainHeader />
          <TopContainer />
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
            <PagerContent index={index} />
          </View>
        ))}
      </PagerContentView>
    </Pager>
  )
}

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView)
const AnimatedExpoScrollForwarderView = Animated.createAnimatedComponent(ExpoScrollForwarderView)

// Scrolling with header is laggy on Expo Go Android because of the "new architecture"
// disabling it in `app.config.ts` fixes the issue on native build
// https://github.com/software-mansion/react-native-reanimated/issues/6992

interface PagerContextValue {
  pagerViewRef: React.RefObject<PagerView | null>
  scrollY: SharedValue<number>
  scrollViewTag: number | null
  setScrollViewTag: (tag: number | null) => void
  registerScrollViewRef: (scrollRef: AnimatedRef<any> | null, atIndex: number) => void
  scrollHandler: ScrollHandlerProcessed<Record<string, unknown>>
  headerHeight: number
  headerOnlyHeight: number
  setHeaderOnlyHeight: React.Dispatch<React.SetStateAction<number>>
  setTabBarHeight: React.Dispatch<React.SetStateAction<number>>
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  adjustScrollForOtherPages: (scrollState: 'idle' | 'dragging' | 'settling') => void
}
const PagerContext = React.createContext<PagerContextValue | null>(null)
function Pager({ children }: { children: React.ReactNode }) {
  // const layout = useWindowDimensions()
  const [currentPage, setCurrentPage] = React.useState(0)

  const isHeaderReady = React.useState(false)
  const [headerOnlyHeight, setHeaderOnlyHeight] = React.useState(0)
  const [tabBarHeight, setTabBarHeight] = React.useState(0)
  const headerHeight = headerOnlyHeight + tabBarHeight

  const scrollY = useSharedValue(0)
  const onScrollWorklet = React.useCallback(
    (e: NativeScrollEvent) => {
      'worklet'
      const nextScrollY = e.contentOffset.y
      // console.log('onScrollWorklet', nextScrollY)
      // HACK: onScroll is reporting some strange values on load (negative header height).
      // Highly improbable that you'd be overscrolled by over 400px -
      // in fact, I actually can't do it, so let's just ignore those. -sfn
      const isPossiblyInvalid =
        headerHeight > 0 && Math.round(nextScrollY * 2) / 2 === -headerHeight
      if (!isPossiblyInvalid) {
        scrollY.set(nextScrollY)
      }
    },
    [scrollY, headerHeight]
  )

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: onScrollWorklet,
  })
  // scroll indicators work inconsistently between Android and iOS so we disable them for now
  // const scrollIndicatorInsets = useDerivedValue(() => ({
  //   top: headerHeight - scrollY.get(),
  // }))

  const pagerViewRef = React.useRef<PagerView>(null)

  const scrollRefs = useSharedValue<(AnimatedRef<any> | null)[]>([])
  const registerScrollViewRef = React.useCallback(
    (scrollRef: AnimatedRef<any> | null, atIndex: number) => {
      scrollRefs.modify((refs) => {
        'worklet'
        refs[atIndex] = scrollRef
        return refs
      })
    },
    [scrollRefs]
  )

  const lastForcedScrollY = useSharedValue(0)
  const currentPageRef = useSharedState(currentPage)
  const headerOnlyHeightRef = useSharedState(headerOnlyHeight)
  const adjustScrollForOtherPages = React.useCallback(
    (scrollState: 'idle' | 'dragging' | 'settling') => {
      'worklet'
      // if (global._WORKLET) {
      //   console.log('UI Thread')
      // } else {
      //   console.log('JS Thread')
      // }
      if (scrollState !== 'dragging') return
      const currentScrollY = scrollY.get()
      const forcedScrollY = Math.min(currentScrollY, headerOnlyHeightRef.get())
      if (lastForcedScrollY.get() === forcedScrollY) return
      lastForcedScrollY.set(forcedScrollY)
      const refs = scrollRefs.get()
      for (let i = 0; i < refs.length; i++) {
        const scollRef = refs[i]
        if (i !== currentPageRef.get() && scollRef != null) {
          scrollTo(scollRef, 0, forcedScrollY, false)
        }
      }
    },
    [currentPageRef, headerOnlyHeightRef, lastForcedScrollY, scrollRefs, scrollY]
  )
  const [scrollViewTag, setScrollViewTag] = React.useState<number | null>(null)

  return (
    <PagerContext.Provider
      value={{
        pagerViewRef,
        scrollY,
        scrollViewTag,
        setScrollViewTag,
        registerScrollViewRef,
        scrollHandler,
        headerHeight,
        headerOnlyHeight,
        setHeaderOnlyHeight,
        setTabBarHeight,
        currentPage,
        setCurrentPage,
        adjustScrollForOtherPages,
      }}
    >
      <PagerTabBarProvider>
        <View className="flex-1 bg-base-bg-default">
          {/* PanGestureRecognizer only works for one view so we have to move it up to the parent */}
          {Platform.OS === 'ios' ? (
            <ExpoScrollForwarderView scrollViewTag={scrollViewTag} style={{ flex: 1 }}>
              {children}
            </ExpoScrollForwarderView>
          ) : (
            children
          )}
        </View>
      </PagerTabBarProvider>
    </PagerContext.Provider>
  )
}

const usePagerContext = () => {
  const context = React.useContext(PagerContext)
  if (!context) {
    throw new Error('usePagerContext must be used within a PagerProvider')
  }
  return context
}

function PagerHeader({ children }: { children: React.ReactNode }) {
  const { scrollViewTag, scrollY, headerOnlyHeight } = usePagerContext()
  const headerTransform = useAnimatedStyle(() => {
    const translateY = -Math.min(scrollY.get(), headerOnlyHeight)
    return { transform: [{ translateY: translateY }] }
  })
  if (Platform.OS === 'android') {
    return (
      <AnimatedExpoScrollForwarderView
        scrollViewTag={scrollViewTag}
        style={[styles.pagerHeader, headerTransform]}
      >
        {/* Somehow a view is required here to make ScrollForward working in android */}
        <View className="bg-transparent">{children}</View>
      </AnimatedExpoScrollForwarderView>
    )
  }
  return <Animated.View style={[styles.pagerHeader, headerTransform]}>{children}</Animated.View>
}

function PagerHeaderOnly({ children }: { children: React.ReactNode }) {
  const { setHeaderOnlyHeight } = usePagerContext()
  const headerRef = React.useRef<View>(null)
  return (
    <View
      ref={headerRef}
      onLayout={() => {
        headerRef.current?.measure((_x: number, _y: number, _width: number, height: number) => {
          // console.log('Header only height:', height)

          if (height > 0) {
            // The rounding is necessary to prevent jumps on iOS
            setHeaderOnlyHeight(Math.round(height * 2) / 2)
          }
        })
      }}
    >
      {children}
    </View>
  )
}

function PagerContentView({ children }: { children: React.ReactNode }) {
  const { pagerViewRef } = usePagerContext()
  const { handlePageScroll } = usePagerTabBarContext()
  return (
    <AnimatedPagerView
      ref={pagerViewRef}
      style={styles.pagerView}
      initialPage={0}
      onPageScroll={handlePageScroll}
    >
      {children}
    </AnimatedPagerView>
  )
}

interface PagerTabBarContextValue {
  dragProgress: SharedValue<number>
  handlePageScroll: EventHandlerProcessed<object, never>
  tabListSize: SharedValue<number>
  tabItemLayouts: SharedValue<{ x: number; width: number }[]>

  onTabLayout: (index: number, layout: { x: number; width: number }) => void
  onTabPressed: (index: number) => void
}
const PagerTabBarContext = React.createContext<PagerTabBarContextValue | null>(null)
interface PagerTabBarProviderProps {
  children: React.ReactNode
}
function PagerTabBarProvider({ children }: PagerTabBarProviderProps) {
  const { setCurrentPage, pagerViewRef, adjustScrollForOtherPages } = usePagerContext()
  const onTabPressed = React.useCallback(
    (index: number) => {
      pagerViewRef.current?.setPage(index)
      setCurrentPage(index)
      runOnUI(adjustScrollForOtherPages)('dragging')
    },
    [adjustScrollForOtherPages, pagerViewRef, setCurrentPage]
  )

  const dragState = useSharedValue<'idle' | 'settling' | 'dragging'>('idle')
  const dragProgress = useSharedValue(0)
  const didInit = useSharedValue(false)
  const handlePageScroll = usePagerHandlers(
    {
      onPageScroll(e: PagerViewOnPageScrollEventData) {
        'worklet'
        if (didInit.get() === false) {
          // On iOS, there's a spurious scroll event with 0 position
          // even if a different page was supplied as the initial page.
          // Ignore it and wait for the first confirmed selection instead.
          return
        }
        dragProgress.set(e.offset + e.position)
      },
      onPageScrollStateChanged(e: PageScrollStateChangedNativeEventData) {
        'worklet'
        // runOnJS(setIsIdle)(e.pageScrollState === 'idle')
        if (dragState.get() === 'idle' && e.pageScrollState === 'settling') {
          // This is a programmatic scroll on Android.
          // Stay "idle" to match iOS and avoid confusing downstream code.
          return
        }
        dragState.set(e.pageScrollState)
        // parentOnPageScrollStateChanged?.(e.pageScrollState)
        adjustScrollForOtherPages(e.pageScrollState)
      },
      onPageSelected(e: PagerViewOnPageSelectedEventData) {
        'worklet'
        didInit.set(true)
        // runOnJS(onPageSelectedJSThread)(e.position)
        runOnJS(setCurrentPage)(e.position)
      },
    },
    [
      setCurrentPage,
      // parentOnPageScrollStateChanged
    ]
  )

  const tabListSize = useSharedValue(0)
  const tabItemLayouts = useSharedValue<{ x: number; width: number }[]>([])
  const onTabLayout = React.useCallback(
    (i: number, layout: { x: number; width: number }) => {
      'worklet'
      tabItemLayouts.modify((tab) => {
        tab[i] = layout
        return tab
      })
    },
    [tabItemLayouts]
  )
  return (
    <PagerTabBarContext.Provider
      value={{
        dragProgress,
        handlePageScroll,
        onTabLayout,
        onTabPressed,
        tabListSize,
        tabItemLayouts,
      }}
    >
      {children}
    </PagerTabBarContext.Provider>
  )
}
const usePagerTabBarContext = () => {
  const context = React.useContext(PagerTabBarContext)
  if (!context) {
    throw new Error('usePagerTabBarContext must be used within a PagerTabBarProvider')
  }
  return context
}

function PagerTabBar({ children }: { children: React.ReactNode }) {
  const { tabListSize } = usePagerTabBarContext()
  const { setTabBarHeight } = usePagerContext()
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="bg-base-bg-white w-full"
      contentContainerClassName="px-4 border-b border-base-outline-default w-full"
      onLayout={(evt) => {
        const height = evt.nativeEvent.layout.height
        if (height > 0) {
          // The rounding is necessary to prevent jumps on iOS
          setTabBarHeight(Math.round(height * 2) / 2)
        }
      }}
    >
      <View
        accessibilityRole="tablist"
        className="flex flex-row"
        onLayout={(e) => {
          tabListSize.set(e.nativeEvent.layout.width)
        }}
      >
        {children}
      </View>
    </ScrollView>
  )
}

function PagerTabBarItemIndicator() {
  const { tabListSize, tabItemLayouts, dragProgress } = usePagerTabBarContext()
  const indicatorStyle = useAnimatedStyle(() => {
    const tabItems = tabItemLayouts.get()
    if (tabItems.length === 0) {
      return { opacity: 0, transform: [{ scaleX: 0 }] }
    }
    // interpolate requires at least 2 items to work properly
    if (tabItems.length === 1) {
      return { opacity: 1, transform: [{ scaleX: 1 }] }
    }
    function getScaleX(index: number) {
      'worklet'
      const itemWidth = tabItems[index].width
      return itemWidth / tabListSize.get()
    }
    function getTranslateX(index: number) {
      'worklet'
      const itemX = tabItems[index].x
      const itemWidth = tabItems[index].width
      return itemX + itemWidth / 2 - tabListSize.get() / 2
    }
    // const scaleX = getScaleX(currentPage)
    // const translateX = getTranslateX(currentPage)
    return {
      opacity: 1,
      transform: [
        {
          translateX: interpolate(
            dragProgress.get(),
            tabItems.map((_, i) => {
              'worklet'
              return i
            }),
            tabItems.map((_, index) => {
              'worklet'
              return getTranslateX(index)
            })
          ),
        },
        {
          scaleX: interpolate(
            dragProgress.get(),
            tabItems.map((_, i) => {
              'worklet'
              return i
            }),
            tabItems.map((_, index) => {
              'worklet'
              return getScaleX(index)
            })
          ),
        },
      ],
    }
  })
  return (
    <Animated.View
      className="absolute -bottom-px left-0 right-0 border-b-2 border-base-primary-default "
      style={indicatorStyle}
    />
  )
}

function PagerContent({ index }: { index: number }) {
  const { headerHeight, registerScrollViewRef, scrollHandler, currentPage, setScrollViewTag } =
    usePagerContext()
  const isFocused = index === currentPage
  const scrollElRef = useAnimatedRef<FlatList>()
  React.useEffect(() => {
    registerScrollViewRef(scrollElRef, index)
    return () => {
      registerScrollViewRef(null, index)
    }
  }, [scrollElRef, registerScrollViewRef, index])

  React.useEffect(() => {
    if (isFocused && scrollElRef.current) {
      const scrollViewTag = findNodeHandle(scrollElRef.current)
      setScrollViewTag(scrollViewTag)
      // console.log('scrollViewTag:', scrollViewTag)
    }
  }, [isFocused, scrollElRef, setScrollViewTag])
  return (
    <Animated.FlatList
      ref={scrollElRef}
      onScroll={scrollHandler}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingTop: headerHeight }}
      // contentOffset={{ x: 0, y: -headerHeight }}
      // scrollIndicatorInsets={{ top: headerHeight, right: 1 }}
      // automaticallyAdjustsScrollIndicatorInsets={false}
      data={Array.from({ length: 5 }, (_, i) => `Item ${i + 1}`)}
      contentContainerClassName="py-4 flex flex-col"
      // TODO: data and renderItem should be replaced with actual data
      renderItem={({ item, index }) => {
        if (index === 0) {
          return <AnnouncementSection />
        }
        return (
          <View className="px-4">
            <FeedPost />
          </View>
        )
      }}
    />
  )
}

const styles = StyleSheet.create({
  pagerHeader: {
    position: 'absolute',
    zIndex: 1,
    top: 0,
    left: 0,
    width: '100%',
  },
  pagerView: {
    flex: 1,
  },
})

function usePagerHandlers(
  handlers: {
    onPageScroll: (e: PagerViewOnPageScrollEventData) => void
    onPageScrollStateChanged: (e: PageScrollStateChangedNativeEventData) => void
    onPageSelected: (e: PagerViewOnPageSelectedEventData) => void
  },
  dependencies: unknown[]
) {
  const { doDependenciesDiffer } = useHandler(handlers as any, dependencies)
  const subscribeForEvents = ['onPageScroll', 'onPageScrollStateChanged', 'onPageSelected']
  return useEvent(
    (event) => {
      'worklet'
      const { onPageScroll, onPageScrollStateChanged, onPageSelected } = handlers
      if (event.eventName.endsWith('onPageScroll')) {
        onPageScroll(event as any as PagerViewOnPageScrollEventData)
      } else if (event.eventName.endsWith('onPageScrollStateChanged')) {
        onPageScrollStateChanged(event as any as PageScrollStateChangedNativeEventData)
      } else if (event.eventName.endsWith('onPageSelected')) {
        onPageSelected(event as any as PagerViewOnPageSelectedEventData)
      }
    },
    subscribeForEvents,
    doDependenciesDiffer
  )
}

// this is a hook is for moving and syncing react state to a SharedValue in the UI thread worklet
// since SharedValue is not reactive and should not be used directly in the render
function useSharedState<T>(value: T): SharedValue<T> {
  const sharedValue = useSharedValue(value)
  React.useEffect(() => {
    sharedValue.value = value
  }, [sharedValue, value])
  return sharedValue
}

function PagerTabBarItem({
  index,
  children,
  ...props
}: React.ComponentProps<typeof Pressable> & {
  index: number
  children?: React.ReactNode
}) {
  const { dragProgress, onTabLayout, onTabPressed } = usePagerTabBarContext()
  const activeStyle = useAnimatedStyle(() => {
    return { opacity: interpolate(dragProgress.get(), [index - 1, index, index + 1], [0, 1, 0]) }
  })
  const handleLayout = (e: LayoutChangeEvent) => {
    runOnUI(onTabLayout)(index, e.nativeEvent.layout)
  }
  const handlePress = () => {
    onTabPressed?.(index)
  }
  return (
    <Pressable
      className="h-10"
      accessibilityRole="tab"
      onLayout={handleLayout}
      onPress={handlePress}
      {...props}
    >
      <Text className="px-4 pt-2 pb-2.5 text-sm font-anakotmai-medium relative text-base-text-placeholder">
        {children}
      </Text>
      <Animated.Text
        style={activeStyle}
        className="px-4 pt-2 pb-2.5 text-sm font-anakotmai-medium text-base-primary-default absolute left-0 top-0 bottom-0 right-0"
        aria-hidden
      >
        {children}
      </Animated.Text>
    </Pressable>
  )
}

function AnnouncementSection() {
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
      <AnnouncementSlides />
    </View>
  )
}

const FeedPost = React.memo(function FeedPost() {
  return (
    <View className="flex flex-col gap-3 p-4 bg-base-bg-white border border-base-outline-default rounded-2xl mt-4">
      <View className="flex flex-row items-center justify-between">
        <View className="flex flex-row items-center">
          <View className="w-8 h-8 rounded-full bg-base-primary-medium flex items-center justify-center mr-3">
            <Icon icon={PPLEIcon} width={20} height={20} className="text-white" />
          </View>
          <View className="flex flex-col">
            <Text className="text-base-text-medium font-anakotmai-medium text-sm">
              ศิริโรจน์ ธนิกกุล - Sirirot Thanikkun
            </Text>
            <Text className="text-base-text-medium font-anakotmai-light text-sm">
              สส.สมุทรสาคร | 1 ชม.
            </Text>
          </View>
        </View>
        <Button variant="ghost" size="icon" aria-label="Share">
          <Icon
            icon={Share2Icon}
            width={16}
            height={16}
            className="text-base-text-high"
            strokeWidth={1}
          />
        </Button>
      </View>
      <View className="rounded-lg overflow-hidden">
        <Image
          style={{ width: '100%', aspectRatio: 1 }}
          source={require('@app/assets/post-1.png')}
          alt=""
        />
      </View>
      <View>
        <Text className="text-base-text-high font-noto-light text-base">
          พบปะแม่ๆ ชมรมผู้สูงอายุดอกลำดวน ณ หมู่บ้านวารัตน์ 3 ม.5 ต. อ้อมน้อย อ.กระทุ่มแบน
          จ.สมุทรสาครชวนให้ผมออกสเตปประกอบ
        </Text>
        <Text className="text-base-primary-default font-noto-light text-base">
          อ่านเพิ่มเติม...
        </Text>
      </View>
      <View className="flex flex-row flex-wrap gap-1">
        <Badge variant="secondary">
          <Text>#pridemonth</Text>
        </Badge>
        <Badge variant="secondary">
          <Text>#ร่างกฎหมาย68</Text>
        </Badge>
      </View>
      <View className="flex flex-row justify-between items-center">
        <View className="flex flex-row gap-1 items-center">
          <Icon
            icon={HeartHandshakeIcon}
            size={18}
            className="fill-base-primary-medium text-white"
            strokeWidth={1}
          />
          <Text className="text-xs font-anakotmai-light text-base-text-medium">32</Text>
        </View>
        <Pressable>
          <Text className="text-xs font-anakotmai-light text-base-text-medium">
            125 ความคิดเห็น
          </Text>
        </Pressable>
      </View>
      <View className="flex flex-col border-t border-base-outline-default pt-4 pb-1">
        <View className="flex flex-row justify-between gap-2">
          <View className="flex flex-row gap-2">
            <Pressable className="flex flex-row items-center gap-1">
              <Icon
                icon={HeartHandshakeIcon}
                size={20}
                strokeWidth={1}
                className="text-base-text-high"
              />
              <Text className="text-sm font-anakotmai-light text-base-text-high">เห็นด้วย</Text>
            </Pressable>
            <Pressable className="flex flex-row items-center gap-1">
              <Icon
                icon={HeartCrackIcon}
                size={20}
                strokeWidth={1}
                className="text-base-text-high"
              />
              <Text className="text-sm font-anakotmai-light text-base-text-high">ไม่เห็นด้วย</Text>
            </Pressable>
          </View>
          <Pressable className="flex flex-row items-center gap-1">
            <Icon
              icon={MessageCircleIcon}
              size={20}
              strokeWidth={1}
              className="text-base-text-high"
            />
            <Text className="text-sm font-anakotmai-light text-base-text-high">ความคิดเห็น</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
})
