// Ref: https://github.com/bluesky-social/social-app/blob/0610c822cf94995c75bbf3237c217b68dabfe5a0/src/view/com/pager/PagerWithHeader.tsx

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
  scrollTo,
  SharedValue,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useEvent,
  useHandler,
  useSharedValue,
} from 'react-native-reanimated'

import { clsx, cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'

import { ScrollContextProvider } from '@app/libs/scroll-context'

import { ExpoScrollForwarderView } from '../../../packages/expo-scroll-forwarder/build'

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

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView)
const AnimatedExpoScrollForwarderView = Animated.createAnimatedComponent(ExpoScrollForwarderView)

// Scrolling with header is laggy on Expo Go Android because of the "new architecture"
// disabling it in `app.config.ts` fixes the issue on native build
// https://github.com/software-mansion/react-native-reanimated/issues/6992

export interface PagerRef {
  scrollToTop: () => void
}

export function Pager({ children, ref }: { children: React.ReactNode; ref?: React.Ref<PagerRef> }) {
  // const layout = useWindowDimensions()
  const [currentPage, setCurrentPage] = React.useState(0)
  const [isHeaderReady, setHeaderReady] = React.useState(false)
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

  const scrollToTop = React.useCallback(() => {
    'worklet'
    const scrollEl = scrollRefs.get()?.[currentPage]
    if (scrollEl) {
      scrollTo(scrollEl, 0, 0, true)
    }
  }, [scrollRefs, currentPage])

  const scrollToTopJS = React.useCallback(() => runOnUI(scrollToTop)(), [scrollToTop])
  React.useImperativeHandle(ref, () => ({
    scrollToTop: scrollToTopJS,
  }))

  const scrollToTopTabBar = React.useCallback(() => {
    'worklet'
    const scrollEl = scrollRefs.get()?.[currentPage]
    if (scrollEl) {
      scrollTo(scrollEl, 0, headerOnlyHeight, true)
    }
  }, [scrollRefs, currentPage, headerOnlyHeight])

  return (
    <PagerContext.Provider
      value={{
        pagerViewRef,
        scrollY,
        scrollViewTag,
        setScrollViewTag,
        registerScrollViewRef,
        headerHeight,
        headerOnlyHeight,
        setHeaderOnlyHeight,
        setTabBarHeight,
        currentPage,
        setCurrentPage,
        adjustScrollForOtherPages,
        isHeaderReady,
        setHeaderReady,
        scrollToTopTabBar,
      }}
    >
      <PagerTabBarProvider>
        <ScrollContextProvider onScroll={onScrollWorklet}>
          <View className="flex-1">
            {/* PanGestureRecognizer only works for one view so we have to move it up to the parent */}
            {Platform.OS === 'ios' ? (
              <ExpoScrollForwarderView scrollViewTag={scrollViewTag} style={{ flex: 1 }}>
                {children}
              </ExpoScrollForwarderView>
            ) : (
              children
            )}
          </View>
        </ScrollContextProvider>
      </PagerTabBarProvider>
    </PagerContext.Provider>
  )
}

interface PagerContextValue {
  pagerViewRef: React.RefObject<PagerView | null>
  scrollY: SharedValue<number>
  scrollViewTag: number | null
  setScrollViewTag: (tag: number | null) => void
  registerScrollViewRef: (scrollRef: AnimatedRef<any> | null, atIndex: number) => void
  headerHeight: number
  headerOnlyHeight: number
  setHeaderOnlyHeight: React.Dispatch<React.SetStateAction<number>>
  setTabBarHeight: React.Dispatch<React.SetStateAction<number>>
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  adjustScrollForOtherPages: (scrollState: 'idle' | 'dragging' | 'settling') => void
  isHeaderReady: boolean
  setHeaderReady: React.Dispatch<React.SetStateAction<boolean>>
  scrollToTopTabBar: () => void
}
const PagerContext = React.createContext<PagerContextValue | null>(null)

const usePagerContext = () => {
  const context = React.useContext(PagerContext)
  if (!context) {
    throw new Error('usePagerContext must be used within a PagerProvider')
  }
  return context
}

export function PagerHeader({ children }: { children: React.ReactNode }) {
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

export function PagerHeaderOnly({ children }: { children: React.ReactNode }) {
  const { setHeaderOnlyHeight, setHeaderReady } = usePagerContext()
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
            setHeaderReady(true)
          }
        })
      }}
    >
      {children}
    </View>
  )
}

export function PagerContentView({ children }: { children: React.ReactNode }) {
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
  indexToOffset: (index: number) => number
  containerSize: SharedValue<number>
  tabBarScrollElRef: AnimatedRef<ScrollView>
  dragProgress: SharedValue<number>
  dragState: SharedValue<'idle' | 'settling' | 'dragging'>
  handlePageScroll: EventHandlerProcessed<object, never>
  tabListSize: SharedValue<number>
  tabItemLayouts: SharedValue<{ x: number; width: number }[]>

  onTabLayout: (index: number, layout: { x: number; width: number }) => void
  onTabPressed: (index: number) => void
  onTabUnmount: (index: number) => void
}
const PagerTabBarContext = React.createContext<PagerTabBarContextValue | null>(null)
interface PagerTabBarProviderProps {
  children: React.ReactNode
}
function PagerTabBarProvider({ children }: PagerTabBarProviderProps) {
  const {
    setCurrentPage,
    pagerViewRef,
    adjustScrollForOtherPages,
    currentPage,
    scrollToTopTabBar,
  } = usePagerContext()

  const containerSize = useSharedValue(0)
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
  const tabBarScrollElRef = useAnimatedRef<ScrollView>()
  const indexToOffset = React.useCallback(
    (index: number) => {
      'worklet'
      const itemsLength = tabItemLayouts.get().length
      const containerWidth = containerSize.get()
      const screenSize = tabListSize.get()
      // assume equal width for each item
      // https://github.com/bluesky-social/social-app/pull/6868/files
      const scrollableWidth = screenSize - containerWidth + PADDING_X * 2
      return (index / (itemsLength - 1)) * scrollableWidth
    },
    [tabItemLayouts, tabListSize, containerSize]
  )

  const onTabPressed = React.useCallback(
    (index: number) => {
      pagerViewRef.current?.setPage(index)
      setCurrentPage(index)
      runOnUI(adjustScrollForOtherPages)('dragging')

      const offset = indexToOffset(index)
      runOnUI(scrollTo)(tabBarScrollElRef, offset, 0, true)

      if (currentPage === index) {
        runOnUI(scrollToTopTabBar)()
      }
    },
    [
      adjustScrollForOtherPages,
      pagerViewRef,
      setCurrentPage,
      tabBarScrollElRef,
      indexToOffset,
      currentPage,
      scrollToTopTabBar,
    ]
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

  const onTabUnmount = React.useCallback(
    (index: number) => {
      'worklet'
      tabItemLayouts.modify((tab) => {
        delete tab[index]
        while (tab.length > 0 && !tab[tab.length - 1]) {
          tab.pop()
        }
        return tab
      })
    },
    [tabItemLayouts]
  )

  const onIndicatorOutOfBounds = React.useCallback(
    (index: number) => {
      pagerViewRef.current?.setPage(index)
      setCurrentPage(index)
      dragProgress.set(index)
    },
    [pagerViewRef, setCurrentPage, dragProgress]
  )
  useAnimatedReaction(
    () => tabItemLayouts.get().length,
    (length, prevLength) => {
      console.log('Tab item layouts changed, length:', length, 'prevLength:', prevLength)
      if (length === prevLength || prevLength === null) return
      if (currentPage >= length) {
        runOnJS(onIndicatorOutOfBounds)(length - 1)
      }
    }
  )

  return (
    <PagerTabBarContext.Provider
      value={{
        indexToOffset,
        containerSize,
        tabBarScrollElRef,
        dragProgress,
        dragState,
        handlePageScroll,
        onTabLayout,
        onTabPressed,
        onTabUnmount,
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

const PADDING_X = 16
export function PagerTabBar({
  children,
  fullWidth = false,
}: {
  children: React.ReactNode
  fullWidth?: boolean
}) {
  const { tabListSize, dragProgress, dragState, indexToOffset, containerSize, tabBarScrollElRef } =
    usePagerTabBarContext()
  const { setTabBarHeight } = usePagerContext()
  const progressToOffset = React.useCallback(
    (progress: number) => {
      'worklet'
      return interpolate(
        // 0...1, 1...2, 2...3 etc
        progress,
        [Math.floor(progress), Math.ceil(progress)],
        [indexToOffset(Math.floor(progress)), indexToOffset(Math.ceil(progress))],
        'clamp'
      )
    },
    [indexToOffset]
  )
  // recenter to the current page when tabs change
  useAnimatedReaction(
    () => dragProgress.get(),
    (nextProgress, prevProgress) => {
      if (
        nextProgress !== prevProgress &&
        dragState.value !== 'idle'
        // This is only OK to do when we're 100% sure we're synced.
        // Otherwise, there would be a jump at the beginning of the swipe.
        // syncScrollState.get() === 'synced'
      ) {
        const offset = progressToOffset(nextProgress)
        scrollTo(tabBarScrollElRef, offset, 0, false)
      }
    }
  )
  return (
    <View className="border-b border-base-outline-default bg-base-bg-white">
      <ScrollView
        horizontal
        ref={tabBarScrollElRef}
        showsHorizontalScrollIndicator={false}
        className="w-full -mb-px"
        contentContainerClassName={clsx(fullWidth && 'w-full')}
        contentContainerStyle={{ paddingHorizontal: PADDING_X }}
        onLayout={(evt) => {
          const height = evt.nativeEvent.layout.height
          containerSize.set(evt.nativeEvent.layout.width)
          if (height > 0) {
            // The rounding is necessary to prevent jumps on iOS
            setTabBarHeight(Math.round(height * 2) / 2)
          }
        }}
      >
        <View
          accessibilityRole="tablist"
          className={clsx('flex flex-row', fullWidth && 'w-full')}
          onLayout={(e) => {
            tabListSize.set(e.nativeEvent.layout.width)
          }}
        >
          {children}
        </View>
      </ScrollView>
    </View>
  )
}

export function PagerTabBarItemIndicator() {
  const { tabListSize, tabItemLayouts, dragProgress } = usePagerTabBarContext()
  const { currentPage } = usePagerContext()
  const indicatorStyle = useAnimatedStyle(() => {
    const tabItems = tabItemLayouts.get()
    if (tabItems.length === 0) {
      return { opacity: 0, transform: [{ scaleX: 0 }] }
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
    // interpolate requires at least 2 items to work properly
    if (tabItems.length === 1) {
      return { opacity: 1, transform: [{ translateX: getTranslateX(0) }, { scaleX: getScaleX(0) }] }
    }
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
  }, [currentPage])
  return (
    <Animated.View
      className="absolute bottom-0 left-0 right-0 border-b-2 border-base-primary-default opacity-0"
      style={indicatorStyle}
    />
  )
}

interface PagerContentProps {
  children: (props: PagerScrollViewProps) => React.ReactNode
  index: number
}

export interface PagerScrollViewProps {
  isFocused: boolean
  headerHeight: number
  scrollElRef: AnimatedRef<FlatList>
  setScrollViewTag: (tag: number | null) => void
}
export function PagerContent({ children, index }: PagerContentProps) {
  const { isHeaderReady, headerHeight, registerScrollViewRef, currentPage, setScrollViewTag } =
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
    if (isHeaderReady && isFocused && scrollElRef.current) {
      const scrollViewTag = findNodeHandle(scrollElRef.current)
      setScrollViewTag(scrollViewTag)
      // console.log('scrollViewTag:', scrollViewTag)
    }
  }, [isHeaderReady, isFocused, scrollElRef, setScrollViewTag])

  if (!isHeaderReady) {
    return null
  }
  return children({
    isFocused,
    headerHeight,
    scrollElRef,
    setScrollViewTag,
  })
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

export function PagerTabBarItem({
  index,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Pressable> & {
  index: number
  children?: React.ReactNode
}) {
  const { dragProgress, onTabLayout, onTabPressed, onTabUnmount } = usePagerTabBarContext()
  const activeStyle = useAnimatedStyle(() => {
    return { opacity: interpolate(dragProgress.get(), [index - 1, index, index + 1], [0, 1, 0]) }
  })
  const handleLayout = (e: LayoutChangeEvent) => {
    runOnUI(onTabLayout)(index, e.nativeEvent.layout)
  }
  const handlePress = () => {
    onTabPressed?.(index)
  }
  React.useLayoutEffect(() => {
    return () => {
      runOnUI(onTabUnmount)(index)
    }
  }, [index, onTabUnmount])
  return (
    <Pressable
      className={cn('h-10 pt-2 pb-2 px-4 justify-center flex-row', className)}
      accessibilityRole="tab"
      onLayout={handleLayout}
      onPress={handlePress}
      {...props}
    >
      <View>
        <Text className="text-sm font-heading-medium relative text-base-text-medium">
          {children}
        </Text>
        <Animated.Text
          style={activeStyle}
          className="text-sm font-heading-medium text-base-primary-default absolute left-0 top-0 bottom-0 right-0"
          aria-hidden
        >
          {children}
        </Animated.Text>
      </View>
    </Pressable>
  )
}
