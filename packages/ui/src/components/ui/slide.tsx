import * as React from 'react'
import { NativeScrollEvent, ScrollView, View } from 'react-native'
import Animated, {
  interpolate,
  interpolateColor,
  runOnJS,
  SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'

import { cn } from '../../lib/utils'

interface SlideContextValue {
  gap: number
  count: number
  itemWidth: number
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  scroll: SharedValue<number>
  scrollViewWidth: number
  setScrollViewWidth: React.Dispatch<React.SetStateAction<number>>
  paddingHorizontal: number
  isLoading: boolean
}
const SlideContext = React.createContext<SlideContextValue | null>(null)
const SlideProvider = SlideContext.Provider
const useSlideContext = () => {
  const context = React.useContext(SlideContext)
  if (!context) {
    throw new Error('useSlideContext must be used within a SlideProvider')
  }
  return context
}
export function Slide({
  gap,
  count,
  itemWidth,
  children,
  paddingHorizontal,
  className,
  isLoading = false,
}: {
  gap: number
  count: number
  itemWidth: number
  children: React.ReactNode
  paddingHorizontal: number
  className?: string
  isLoading?: boolean
}) {
  const [currentPage, setCurrentPage] = React.useState(0)
  const [scrollViewWidth, setScrollViewWidth] = React.useState(0)
  const scroll = useSharedValue(0)
  return (
    <SlideProvider
      value={{
        gap,
        count,
        itemWidth,
        currentPage,
        setCurrentPage,
        scroll,
        scrollViewWidth,
        setScrollViewWidth,
        paddingHorizontal,
        isLoading,
      }}
    >
      <View className={cn('w-full flex flex-col gap-4', className)}>{children}</View>
    </SlideProvider>
  )
}

export function SlideIndicators() {
  const { count } = useSlideContext()
  // TODO: calculate number of indicators based on the number of items and width of the carousel
  // number of indicators might not equal the number of images since in large screen it might show more than one item
  if (count <= 1) {
    return null
  }
  return (
    <View className="flex flex-row items-center justify-center gap-1">
      {Array.from({ length: count }).map((_, index) => (
        <SlideIndicator key={index} index={index} />
      ))}
    </View>
  )
}

export function SlideIndicator({ index }: { index: number }) {
  const { scroll, itemWidth, count, scrollViewWidth, gap, paddingHorizontal, isLoading } =
    useSlideContext()
  const animatedStyle = useAnimatedStyle(() => {
    const itemWidthWithGap = itemWidth + gap
    const getSnapPoint = (i: number) => {
      if (i === count - 1) {
        return i * itemWidthWithGap - (scrollViewWidth - paddingHorizontal * 2 - itemWidth - gap)
      }
      return i * itemWidthWithGap
    }
    const snapRange = [getSnapPoint(index - 1), getSnapPoint(index), getSnapPoint(index + 1)]
    const widthRange = [6, 24, 6]
    const colorRange = ['#CBD5E1', '#FF6A13', '#CBD5E1']
    if (index === 0) {
      snapRange.shift()
      widthRange.shift()
      colorRange.shift()
    } else if (index === count - 1) {
      snapRange.pop()
      widthRange.pop()
      colorRange.pop()
    }
    return {
      width: interpolate(scroll.value, snapRange, widthRange, 'clamp'),
      backgroundColor: isLoading
        ? '#F1F5F9'
        : interpolateColor(scroll.value, snapRange, colorRange),
    }
  }, [isLoading])
  return <Animated.View style={animatedStyle} className="h-1.5 rounded-full" />
}

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView)
export function SlideScrollView(props: { children: React.ReactNode }) {
  const {
    gap,
    itemWidth,
    currentPage,
    setCurrentPage,
    scroll,
    setScrollViewWidth,
    paddingHorizontal,
  } = useSlideContext()
  const onScrollWorklet = React.useCallback(
    (event: NativeScrollEvent) => {
      'worklet'
      scroll.set(event.contentOffset.x)
      const current = Math.max(0, Math.round(event.contentOffset.x / itemWidth))
      if (currentPage !== current) {
        runOnJS(setCurrentPage)(current)
      }
    },
    [setCurrentPage, currentPage, itemWidth, scroll]
  )
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: onScrollWorklet,
  })
  return (
    <AnimatedScrollView
      onScroll={scrollHandler}
      horizontal
      showsHorizontalScrollIndicator={false}
      className="w-full"
      contentContainerStyle={{ gap, paddingHorizontal }}
      pagingEnabled
      snapToInterval={itemWidth + gap}
      disableIntervalMomentum
      onLayout={(e) => {
        setScrollViewWidth(e.nativeEvent.layout.width)
      }}
    >
      {props.children}
    </AnimatedScrollView>
  )
}

export function SlideItem(props: { className?: string; children: React.ReactNode }) {
  const { itemWidth } = useSlideContext()
  return (
    <View style={{ width: itemWidth }} className={props.className}>
      {props.children}
    </View>
  )
}
