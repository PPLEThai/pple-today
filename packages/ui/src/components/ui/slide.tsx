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

interface CarouselContextValue {
  gap: number
  count: number
  itemWidth: number
  currentPage: number
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>
  scroll: SharedValue<number>
  scrollViewWidth: number
  setScrollViewWidth: React.Dispatch<React.SetStateAction<number>>
  paddingHorizontal: number
}
const CarouselContext = React.createContext<CarouselContextValue | null>(null)
const CarouselProvider = CarouselContext.Provider
const useCarouselContext = () => {
  const context = React.useContext(CarouselContext)
  if (!context) {
    throw new Error('useCarouselContext must be used within a CarouselProvider')
  }
  return context
}
export function Carousel({
  gap,
  count,
  itemWidth,
  children,
  paddingHorizontal,
  className,
}: {
  gap: number
  count: number
  itemWidth: number
  children: React.ReactNode
  paddingHorizontal: number
  className?: string
}) {
  const [currentPage, setCurrentPage] = React.useState(0)
  const [scrollViewWidth, setScrollViewWidth] = React.useState(0)
  const scroll = useSharedValue(0)
  return (
    <CarouselProvider
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
      }}
    >
      <View className={cn('w-full flex flex-col gap-4', className)}>{children}</View>
    </CarouselProvider>
  )
}

export function CarouselIndicators() {
  const { count } = useCarouselContext()
  // TODO: calculate number of indicators based on the number of items and width of the carousel
  // number of indicators might not equal the number of images since in large screen it might show more than one item
  return (
    <View className="flex flex-row items-center justify-center gap-1">
      {Array.from({ length: count }).map((_, index) => (
        <CarouselIndicator key={index} index={index} />
      ))}
    </View>
  )
}

export function CarouselIndicator({ index }: { index: number }) {
  const { scroll, itemWidth, count, scrollViewWidth, gap, paddingHorizontal } = useCarouselContext()
  const animatedStyle = useAnimatedStyle(() => {
    const itemWidthWithGap = itemWidth + gap
    const getSnapPoint = (i: number) => {
      if (i === count - 1) {
        return i * itemWidthWithGap - (scrollViewWidth - paddingHorizontal * 2 - itemWidth - gap)
      }
      return i * itemWidthWithGap
    }

    const snapRange = [getSnapPoint(index - 1), getSnapPoint(index), getSnapPoint(index + 1)]
    const inputRange = [-1, 0, 1]
    const input = interpolate(scroll.value, snapRange, inputRange, 'clamp')
    const width = interpolate(input, inputRange, [6, 24, 6])
    const color = interpolateColor(input, inputRange, ['#CBD5E1', '#FF6A13', '#CBD5E1'])
    return {
      width: width,
      backgroundColor: color,
    }
  })
  return <Animated.View style={animatedStyle} className="h-1.5 rounded-full" />
}

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView)
export function CarouselScrollView(props: { children: React.ReactNode }) {
  const {
    gap,
    itemWidth,
    currentPage,
    setCurrentPage,
    scroll,
    setScrollViewWidth,
    paddingHorizontal,
  } = useCarouselContext()
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
      // disableIntervalMomentum
      onLayout={(e) => {
        setScrollViewWidth(e.nativeEvent.layout.width)
      }}
    >
      {props.children}
    </AnimatedScrollView>
  )
}

export function CarouselItem(props: { className?: string; children: React.ReactNode }) {
  const { itemWidth } = useCarouselContext()
  return (
    <View style={{ width: itemWidth }} className={props.className}>
      {props.children}
    </View>
  )
}
