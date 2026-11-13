import React from 'react'
import { Image, ImageSourcePropType, Keyboard, LayoutChangeEvent, View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@pple-today/ui/text'
import { GlassView } from 'expo-glass-effect'
import * as Haptics from 'expo-haptics'
import { usePathname } from 'expo-router'
import type { BottomTabBarProps } from 'expo-router/js-tabs'
import { SFSymbol, SymbolView } from 'expo-symbols'

export type GlassTab = {
  /** The tab's route name. */
  name: string
  icon: { sf: { default: SFSymbol; selected: SFSymbol } } | { image: ImageSourcePropType }
}

const TEXT_COLOR = '#0F172A' // base-text-high
const SELECTED_TEXT_COLOR = '#FFFFFF'
const SELECTED_TINT = 'rgba(255,106,19,0.8)' // base-primary-default
const BAR_TINT = 'rgba(255,255,255,0.6)'
const BAR_HEIGHT = 62
const BAR_PADDING = 4
// Gap between the bar and the content that ends above it.
const CONTENT_GAP = 8

/** The bar's distance from the screen's bottom edge. */
function barBottomOffset(safeAreaBottom: number) {
  return Math.max(safeAreaBottom - 12, 8)
}

const SPRING = { damping: 20, stiffness: 220, mass: 0.8 }
// The pill's size while a finger is on the bar.
const PILL_DRAGGING_SCALE = 1.25
// The pill trails the finger by a quick spring.
const FOLLOW_SPRING = { damping: 28, stiffness: 600, mass: 0.6 }
// How far a finger can move and still count as a tap.
const TAP_SLOP = 10

const TabBarOverlapContext = React.createContext({ overlap: 0, safeAreaBottom: 0 })

/**
 * Wraps each tab screen (the navigator's `screenLayout`). The tab bar floats
 * over the screens, so, as under the native tab bar, a screen's bottom safe
 * area becomes the height the bar covers: `pb-safe` and `useSafeAreaInsets()`
 * keep fixed bottom UI clear of it.
 */
export function TabBarSafeArea({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets()
  const overlap = barBottomOffset(insets.bottom) + BAR_HEIGHT + CONTENT_GAP
  const value = React.useMemo(
    () => ({ overlap, safeAreaBottom: insets.bottom }),
    [overlap, insets.bottom]
  )
  const screenInsets = React.useMemo(() => ({ ...insets, bottom: overlap }), [insets, overlap])
  return (
    <TabBarOverlapContext.Provider value={value}>
      <SafeAreaInsetsContext.Provider value={screenInsets}>
        {children}
      </SafeAreaInsetsContext.Provider>
    </TabBarOverlapContext.Provider>
  )
}

/** How much of the screen's bottom the floating tab bar covers; 0 without it. */
export function useTabBarOverlap() {
  return React.useContext(TabBarOverlapContext).overlap
}

/**
 * Spread on a tab screen's list so its end scrolls clear of the floating tab
 * bar. Pass `automatic: true` for a list with `contentInsetAdjustmentBehavior:
 * 'automatic'` (UIKit already insets it by the home indicator).
 */
export function useTabBarScrollInsets({ automatic = false }: { automatic?: boolean } = {}) {
  const { overlap, safeAreaBottom } = React.useContext(TabBarOverlapContext)
  if (!overlap) return {}
  const bottom = overlap - (automatic ? safeAreaBottom : 0)
  return { contentInset: { bottom }, scrollIndicatorInsets: { bottom } }
}

interface GlassTabBarProps extends BottomTabBarProps {
  tabs: GlassTab[]
  /** Runs when the selected tab is tapped again, after its stack pops to the top. */
  onReselect?: (pathname: string) => void
}

/**
 * iOS 26: a Liquid Glass tab bar with the selected tab in an orange glass pill.
 * Tap a tab to switch, or hold the bar and drag the pill to another tab. Used in
 * place of the native tab bar, whose selection can't be tinted.
 */
export function GlassTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  tabs,
  onReselect,
}: GlassTabBarProps) {
  const pathname = usePathname()
  const routes = tabs.map((tab) => state.routes.find((route) => route.name === tab.name)!)
  const focusedKey = state.routes[state.index]?.key
  const selectedIndex = routes.findIndex((route) => route.key === focusedKey)
  const labelledTabs = tabs.map((tab, index) => {
    const route = routes[index]
    const options = route ? descriptors[route.key]?.options : undefined
    return { ...tab, label: String(options?.title ?? tab.name) }
  })
  const emitTabPress = (index: number) => {
    const route = routes[index]
    if (!route) return true
    return !emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
      .defaultPrevented
  }
  return (
    <GlassTabBarView
      tabs={labelledTabs}
      selectedIndex={selectedIndex}
      onSelect={(index) => {
        if (emitTabPress(index)) navigateToTab(routes[index]!.key)
      }}
      onReselect={(index) => {
        // The tab's stack pops to its root on tabPress; on the root, scroll to top.
        emitTabPress(index)
        onReselect?.(pathname)
      }}
    />
  )
}

interface GlassTabBarViewProps {
  tabs: (GlassTab & { label: string })[]
  selectedIndex: number
  /** Switch to another tab. */
  onSelect: (index: number) => void
  /** The selected tab was tapped again. */
  onReselect: (index: number) => void
  /** Extra distance from the screen's bottom edge, e.g. to sit above another bar. */
  raise?: number
}

/** The glass bar itself, apart from navigation. */
export function GlassTabBarView({
  tabs,
  selectedIndex,
  onSelect,
  onReselect,
  raise = 0,
}: GlassTabBarViewProps) {
  const insets = useSafeAreaInsets()
  const keyboardVisible = useKeyboardVisible()
  // The tab under the finger while dragging, shown as selected until released.
  const [dragIndex, setDragIndex] = React.useState<number | null>(null)
  // While dragging, the orange pill becomes a clear lens over the tabs, which
  // refracts them, as the native tab bar's does.
  const [isDragging, setIsDragging] = React.useState(false)
  // A tap to another tab plays the same lens briefly while the pill slides.
  const showLens = isDragging
  // The tab under the finger, on the pill and under the lens.
  const lensIndex = dragIndex
  const shownIndex = dragIndex ?? selectedIndex

  const tabWidth = useSharedValue(0)
  const pillX = useSharedValue(0)
  const pillScale = useSharedValue(1)
  const dragging = useSharedValue(false)
  const hovered = useSharedValue(-1)
  const startX = useSharedValue(0)
  const activated = useSharedValue(false)

  // The pill sits on the selected tab once both it and the bar's width are
  // known, whichever comes last: springing there when it moves, jumping there
  // the first time.
  const [rowWidth, setRowWidth] = React.useState(0)
  const pillPlaced = React.useRef(false)
  React.useEffect(() => {
    if (rowWidth <= 0 || selectedIndex < 0 || dragging.value) return
    const x = selectedIndex * (rowWidth / tabs.length)
    pillX.value = pillPlaced.current ? withSpring(x, SPRING) : x
    pillPlaced.current = true
  }, [selectedIndex, rowWidth, tabs.length, dragging, pillX])

  const onRowLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width
    tabWidth.value = width / tabs.length
    setRowWidth(width)
  }

  // For VoiceOver, which activates a tab without a touch.
  const pressTab = (index: number) => {
    if (index === selectedIndex) onReselect(index)
    else onSelect(index)
  }

  /** The finger lifted over `index`; `moved` is false for a plain tap. */
  const endTouch = (index: number, moved: boolean) => {
    setDragIndex(null)
    setIsDragging(false)
    if (index !== selectedIndex) onSelect(index)
    else if (!moved) onReselect(index)
  }

  const cancelTouch = () => {
    setDragIndex(null)
    setIsDragging(false)
  }

  const onHover = (index: number, first: boolean) => {
    setDragIndex(index)
    if (!first) Haptics.selectionAsync()
  }

  const count = tabs.length
  const indexAt = (x: number) => {
    'worklet'
    if (tabWidth.value <= 0) return 0
    return Math.min(count - 1, Math.max(0, Math.floor(x / tabWidth.value)))
  }
  const followFinger = (x: number) => {
    'worklet'
    const maxX = (count - 1) * tabWidth.value
    pillX.value = withSpring(Math.min(maxX, Math.max(0, x - tabWidth.value / 2)), FOLLOW_SPRING)
    const index = indexAt(x)
    if (index !== hovered.value) {
      const first = hovered.value === -1
      hovered.value = index
      runOnJS(onHover)(index, first)
    }
  }

  // One gesture from the first touch, like the native tab bar: the pill
  // swells into the lens and springs to the finger at once, follows it, and
  // lifting the finger picks the tab under it (a tap is the same, without
  // moving).
  const gesture = usePanGesture({
    minDistance: 0,
    onBegin: (event) => {
      'worklet'
      // The first touch: no waiting to tell a tap from a drag.
      dragging.value = true
      hovered.value = -1
      startX.value = event.x
      activated.value = false
      runOnJS(setIsDragging)(true)
      pillScale.value = withSpring(PILL_DRAGGING_SCALE, SPRING)
      followFinger(event.x)
    },
    onActivate: () => {
      'worklet'
      activated.value = true
    },
    onUpdate: (event) => {
      'worklet'
      followFinger(event.x)
    },
    onFinalize: (event) => {
      'worklet'
      if (!dragging.value) return
      dragging.value = false
      pillScale.value = withSpring(1, SPRING)
      // A quick tap ends before the pan activates, reported as cancelled; only
      // a pan cancelled once moving (e.g. by the system) puts the pill back.
      if (event.canceled && activated.value) {
        if (selectedIndex >= 0) pillX.value = withSpring(selectedIndex * tabWidth.value, SPRING)
        runOnJS(cancelTouch)()
        return
      }
      const index = indexAt(event.x)
      pillX.value = withSpring(index * tabWidth.value, SPRING)
      runOnJS(endTouch)(index, Math.abs(event.x - startX.value) > TAP_SLOP)
    },
  })

  const pillStyle = useAnimatedStyle(() => ({
    width: tabWidth.value,
    opacity: tabWidth.value > 0 && selectedIndex >= 0 ? 1 : 0,
    transform: [{ translateX: pillX.value }, { scale: pillScale.value }],
  }))

  if (keyboardVisible) return null

  return (
    // Floats over the screens, which scroll under it (see `useTabBarScrollInsets`).
    <View
      pointerEvents="box-none"
      className="absolute left-0 right-0 bottom-0 px-4"
      style={{ paddingBottom: barBottomOffset(insets.bottom) + raise }}
    >
      <View style={{ height: BAR_HEIGHT }}>
        <GlassView
          // Clear glass refracts what scrolls behind the bar more strongly than
          // regular; the faint white keeps the black labels readable over photos.
          glassEffectStyle="clear"
          tintColor={BAR_TINT}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: BAR_HEIGHT / 2,
          }}
        />
        {/* Outside the bar's glass, so the pill can grow past its edges. */}
        <GestureDetector gesture={gesture}>
          <View
            className="flex-row"
            style={{
              position: 'absolute',
              top: BAR_PADDING,
              left: BAR_PADDING,
              right: BAR_PADDING,
              bottom: BAR_PADDING,
            }}
            onLayout={onRowLayout}
            accessibilityRole="tablist"
          >
            <Animated.View
              pointerEvents="none"
              style={[{ position: 'absolute', top: 0, bottom: 0, left: 0 }, pillStyle]}
            >
              <GlassView
                glassEffectStyle="clear"
                tintColor={SELECTED_TINT}
                style={{ flex: 1, borderRadius: (BAR_HEIGHT - BAR_PADDING * 2) / 2 }}
              />
            </Animated.View>
            {tabs.map((tab, index) => {
              const isShown = index === shownIndex
              // The tab on the pill is white and filled: under the lens while it
              // moves, otherwise the selected one.
              const onPill = showLens ? index === lensIndex : isShown
              return (
                <View
                  key={tab.name}
                  className="flex-1 items-center justify-center gap-0.5"
                  accessible
                  accessibilityRole="tab"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected: index === selectedIndex }}
                  accessibilityActions={[{ name: 'activate' }]}
                  onAccessibilityAction={(event) => {
                    if (event.nativeEvent.actionName === 'activate') pressTab(index)
                  }}
                >
                  <TabContent
                    tab={tab}
                    filled={onPill}
                    color={onPill ? SELECTED_TEXT_COLOR : TEXT_COLOR}
                  />
                </View>
              )
            })}
            {/* The lens: clear glass over the pill and tabs, which refract through it. */}
            <Animated.View
              pointerEvents="none"
              style={[{ position: 'absolute', top: 0, bottom: 0, left: 0 }, pillStyle]}
            >
              <GlassView
                glassEffectStyle={{ style: showLens ? 'clear' : 'none', animate: true }}
                style={{ flex: 1, borderRadius: (BAR_HEIGHT - BAR_PADDING * 2) / 2 }}
              />
            </Animated.View>
          </View>
        </GestureDetector>
      </View>
    </View>
  )
}

function TabContent(props: { tab: GlassTab & { label: string }; filled: boolean; color: string }) {
  const { tab, filled, color } = props
  return (
    <>
      {'sf' in tab.icon ? (
        <SymbolView
          name={filled ? tab.icon.sf.selected : tab.icon.sf.default}
          tintColor={color}
          size={24}
        />
      ) : (
        <Image source={tab.icon.image} style={{ width: 24, height: 24, tintColor: color }} />
      )}
      <Text
        style={{ color, fontSize: 11, lineHeight: 14 }}
        className="font-heading-bold"
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
      >
        {tab.label}
      </Text>
    </>
  )
}

function useKeyboardVisible() {
  const [visible, setVisible] = React.useState(false)
  React.useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setVisible(true))
    const hide = Keyboard.addListener('keyboardWillHide', () => setVisible(false))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])
  return visible
}
