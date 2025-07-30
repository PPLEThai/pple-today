import * as React from 'react'
import {
  LayoutChangeEvent,
  NativeScrollEvent,
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
  runOnJS,
  runOnUI,
  ScrollHandlerProcessed,
  scrollTo,
  SharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useEvent,
  useHandler,
  useSharedValue,
} from 'react-native-reanimated'
import { SceneMap } from 'react-native-tab-view'

import { Badge } from '@pple-today/ui/badge'
import { Button } from '@pple-today/ui/button'
import { Icon } from '@pple-today/ui/icon'
import { Text } from '@pple-today/ui/text'
import { H2, H3 } from '@pple-today/ui/typography'
import { Image } from 'expo-image'
import { Stack, useRouter } from 'expo-router'
import {
  ArrowRightIcon,
  BellIcon,
  ClockIcon,
  ContactRoundIcon,
  MapPinIcon,
  MapPinnedIcon,
  RadioTowerIcon,
} from 'lucide-react-native'

import PPLEIcon from '@app/assets/pple-icon.svg'
import { KeyboardAvoidingViewLayout } from '@app/components/keyboard-avoiding-view-layout'
import { useUser } from '@app/libs/auth'
import { useNonReactiveCallback } from '@app/libs/hooks/useNonReactiveCallback'

export default function IndexLayout() {
  return (
    <KeyboardAvoidingViewLayout>
      <TabViewInsideScroll />
    </KeyboardAvoidingViewLayout>
  )
}

function MainHeader() {
  const userQuery = useUser()
  const router = useRouter()
  return (
    <View className="w-full px-4 pt-10 pb-2 flex flex-row justify-between gap-2 bg-base-bg-white border-b border-base-outline-default pointer-events-box-none">
      <View className="flex flex-row items-center gap-3">
        <Pressable
          className="w-10 h-10 flex flex-col items-center justify-center"
          onPress={() => router.navigate('/(tabs)/(top-tabs)/playground')}
        >
          <PPLEIcon width={35} height={30} />
        </Pressable>
        {/* TODO: What to show when user is loading or not logged in? */}
        {userQuery.data && (
          <View className="flex flex-col pointer-events-none">
            <Text className="font-anakotmai-light text-xs">ยินดีต้อนรับ</Text>
            <Text className="font-anakotmai-bold text-2xl text-base-primary-default">
              {userQuery.data.given_name}
            </Text>
          </View>
        )}
      </View>
      <View className="flex flex-row gap-4">
        <Button variant="secondary" size="icon" aria-label="Notifications">
          <Icon icon={BellIcon} size={20} className="fill-base-secondary-default" />
        </Button>
        {/* TODO: avatar or profile picture */}
        <Button size="icon" aria-label="Profile Settings">
          <Icon icon={PPLEIcon} width={20} height={20} color="white" />
        </Button>
      </View>
    </View>
  )
}

function TopContainer() {
  return (
    <View className="flex flex-col w-full bg-base-bg-white pointer-events-box-none">
      <BannerSection />
      <EventSection />
      <UserInfoSection />
    </View>
  )
}

const BANNER_ITEMS: BannerItem[] = [
  { id: '1', image: require('@app/assets/banner-1.png'), description: 'พรรคประชาชน' },
  { id: '2', image: require('@app/assets/banner-2.png'), description: 'พรรคประชาชน' },
  { id: '3', image: require('@app/assets/banner-1.png'), description: 'พรรคประชาชน' },
]

interface BannerItem {
  id: string
  image: any
  description: string
}

function BannerSection() {
  return (
    <View className="w-full pt-2 py-4 pointer-events-box-none">
      <Carousel>
        <CarouselScrollView>
          {BANNER_ITEMS.map((item) => (
            <CarouselItem key={item.id} item={item} />
          ))}
        </CarouselScrollView>
        <CarouselIndicator />
      </Carousel>
    </View>
  )
}

function Carousel({ children }: { children: React.ReactNode }) {
  return <View className="w-full flex flex-col gap-4">{children}</View>
}

function CarouselIndicator() {
  // TODO: Implement actual indicator logic
  return (
    <View className="flex flex-row items-center justify-center gap-1">
      <View className="w-6 h-1.5 bg-base-primary-default rounded-full" />
      <View className="w-1.5 h-1.5 bg-base-bg-dark rounded-full" />
      <View className="w-1.5 h-1.5 bg-base-bg-dark rounded-full" />
    </View>
  )
}
function CarouselScrollView(props: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="w-full"
      contentContainerClassName="gap-2 px-4"
    >
      {props.children}
    </ScrollView>
  )
}

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj['

function CarouselItem(props: { item: BannerItem }) {
  return (
    <View className="w-[320px] h-[180px] bg-base-bg-light rounded-xl border border-base-outline-default flex items-center justify-center overflow-hidden">
      <Image
        alt={props.item.description}
        source={props.item.image}
        placeholder={{ blurhash }}
        style={{ width: 320, height: 180 }}
        contentFit="cover"
        transition={300}
      />
    </View>
  )
}

function EventSection() {
  return (
    <View className="flex flex-col items-center justify-center gap-2 px-4 pb-4 pointer-events-box-none">
      <View className="flex flex-row gap-2 justify-start items-center w-full pointer-events-none">
        <Icon icon={RadioTowerIcon} size={20} className="text-base-primary-default" />
        <H2 className="text-xl font-anakotmai-bold text-base-text-high">อิเวนต์ตอนนี้</H2>
      </View>
      <ElectionCard />
    </View>
  )
}

function ElectionCard() {
  return (
    <View className="w-full bg-base-secondary-default rounded-2xl flex flex-col gap-4 p-4 pointer-events-box-none">
      <View className="flex flex-col items-start gap-2">
        <Badge variant="secondary">
          <Text>เลือกตั้งในสถานที่</Text>
        </Badge>
        <H3 className="text-base-text-invert font-anakotmai-bold text-lg pointer-events-box-none">
          เลือกตั้งตัวแทนสมาชิกพรรคประจำ อ.เมือง จ.ระยอง
        </H3>
        <View className="flex flex-col gap-1 pointer-events-none">
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
  return (
    <View className="flex flex-row justify-between items-center w-full px-4">
      <View className="flex flex-col items-start pointer-events-none">
        <View className="flex flex-row items-center gap-2">
          <Icon icon={MapPinnedIcon} size={16} className="text-base-primary-medium" />
          <H2 className="text-xs text-base-text-high font-anakotmai-light">พื้นที่ของคุณ</H2>
        </View>
        <Text className="text-lg text-base-primary-default font-anakotmai-bold">
          สามเสนใน, พญาไท
        </Text>
        <Text className="text-sm text-base-text-high font-anakotmai-light">กรุงเทพมหานคร</Text>
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

export function FeedTabs() {
  return <Stack screenOptions={{ headerShown: false }} />
}

function FirstRoute() {
  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: 'blue' }}>
      <Text style={{ color: 'white' }}>First Route</Text>
    </View>
  )
}

function SecondRoute() {
  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: 'purple' }}>
      <Text style={{ color: 'white' }}>Second Route</Text>
    </View>
  )
}

const renderScene = SceneMap({
  first: FeedTabs,
  second: SecondRoute,
})

const routes = [
  { key: 'first', title: 'First' },
  { key: 'second', title: 'Second' },
]

// Ref: https://github.com/bluesky-social/social-app/blob/0610c822cf94995c75bbf3237c217b68dabfe5a0/src/view/com/pager/PagerWithHeader.tsx

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView)

export function TabViewInsideScroll() {
  // const layout = useWindowDimensions()
  const [currentPage, setCurrentPage] = React.useState(0)
  React.useEffect(() => {
    console.log('Current page:', currentPage)
  }, [currentPage])

  const headerRef = React.useRef<View>(null)
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
  const headerTransform = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: -scrollY.get() }],
    }
  })

  const scrollIndicatorInsets = useDerivedValue(() => ({
    top: headerHeight - scrollY.get(),
  }))
  // capture the header bar sizing
  const onTabBarLayout = useNonReactiveCallback((evt: LayoutChangeEvent) => {
    const height = evt.nativeEvent.layout.height
    if (height > 0) {
      // The rounding is necessary to prevent jumps on iOS
      setTabBarHeight(Math.round(height * 2) / 2)
    }
  })
  const onHeaderOnlyLayout = useNonReactiveCallback((height: number) => {
    if (height > 0) {
      // The rounding is necessary to prevent jumps on iOS
      setHeaderOnlyHeight(Math.round(height * 2) / 2)
    }
  })
  const pagerView = React.useRef<PagerView>(null)

  const scrollRefs = useSharedValue<(AnimatedRef<any> | null)[]>([])
  const registerRef = React.useCallback(
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
  const onTabPressed = React.useCallback(() => {
    runOnUI(adjustScrollForOtherPages)('dragging')
  }, [adjustScrollForOtherPages])

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

  return (
    <View className="flex-1 bg-base-bg-default">
      <Animated.View
        pointerEvents="box-none"
        style={[styles.pageHeader, headerTransform]}
        ref={headerRef}
        collapsable={false}
        onLayout={() => {
          headerRef.current?.measure((_x: number, _y: number, _width: number, height: number) => {
            // console.log('Header only height:', height)
            onHeaderOnlyLayout(height)
          })
        }}
      >
        <MainHeader />
        <TopContainer />
        <View className="px-4 bg-base-bg-white flex flex-row items-start pointer-events-none">
          <H2 className="text-3xl pt-6">ประชาชนวันนี้</H2>
        </View>
      </Animated.View>
      {/* PagerProvider */}
      <>
        {/* <TabBar
        items={items}
        selectedPage={currentPage}
        onSelect={onSelect}
        onPressSelected={onCurrentPageSelected}
        dragProgress={dragProgress}
        dragState={dragState}
        /> */}
        {/* <Animated.ScrollView
          onScroll={scrollHandler}
          style={{ paddingTop: headerHeight }}
          // scrollIndicatorInsets={scrollIndicatorInsets as SharedValue<Insets | undefined>}
        ></Animated.ScrollView> */}
        <PagerProvider value={{ registerRef, scrollHandler, headerHeight }}>
          <AnimatedPagerView
            ref={pagerView}
            style={styles.pagerView}
            initialPage={0}
            onPageScroll={handlePageScroll}
          >
            {Array.from({ length: 3 }).map((_, index) => (
              <View key={index} collapsable={false}>
                <PagerContent index={index} />
              </View>
            ))}
          </AnimatedPagerView>
        </PagerProvider>
      </>
    </View>
  )
}
interface PagerContextValue {
  registerRef: (scrollRef: AnimatedRef<any> | null, atIndex: number) => void
  scrollHandler: ScrollHandlerProcessed<Record<string, unknown>>
  headerHeight: number
}
const PagerContext = React.createContext<PagerContextValue | null>(null)
const PagerProvider = PagerContext.Provider
const usePagerContext = () => {
  const context = React.useContext(PagerContext)
  if (!context) {
    throw new Error('usePagerContext must be used within a PagerProvider')
  }
  return context
}

function PagerContent({ index }: { index: number }) {
  const { headerHeight, registerRef, scrollHandler } = usePagerContext()
  const scrollElRef = useAnimatedRef<FlatList>()
  React.useEffect(() => {
    registerRef(scrollElRef, index)
    return () => {
      registerRef(null, index)
    }
  }, [scrollElRef, registerRef, index])

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
      data={Array.from({ length: 20 }, (_, i) => `Item ${i + 1}`)}
      contentContainerClassName="px-3 py-4 flex flex-col gap-3"
      renderItem={({ item, index }) => (
        <View className="flex flex-col gap-3 p-4 h-40 bg-base-bg-white border border-base-outline-default rounded-2xl">
          <Text>{item}</Text>
          <Button
            onPress={() =>
              runOnUI(() => {
                scrollTo(scrollElRef, 0, (160 + 12) * index + headerHeight, true)
              })()
            }
          >
            <Text>Scroll to {160 * index + headerHeight}</Text>
          </Button>
        </View>
      )}
    />
  )
}

// brief structure for PagerView with Header
// <Pager>
//   <PagerHeader>
//     <CustomHeader />
//     <PagerTabBar>
//       <PagerTab>Tab 1</PagerTab>
//       <PagerTab>Tab 2</PagerTab>
//       <PagerTab>Tab 3</PagerTab>
//     </PagerTabBar>
//   </PagerHeader>
//   <PagerContent> // PagerView
//     <PagerItem>Tab 1</PagerItem> // <View key="1"><List/></View>
//     <PagerItem>Tab 2</PagerItem>
//     <PagerItem>Tab 3</PagerItem>
//   </PagerContent>
// </Pager>

const styles = StyleSheet.create({
  pageHeader: {
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
