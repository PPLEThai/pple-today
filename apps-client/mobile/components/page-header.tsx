import React from 'react'
import { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { GlassView } from 'expo-glass-effect'
import { Stack, useRouter } from 'expo-router'
import { LucideIcon } from 'lucide-react-native'

import { BackButton } from '@app/components/back-button'
import { useTabBarScrollInsets } from '@app/components/glass-tab-bar'
import { SafeAreaLayout } from '@app/components/safe-area-layout'
import { supportsLiquidGlass } from '@app/utils/liquid-glass'

interface HeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  onBack?: () => void
  /** iOS 26: Liquid Glass behind the bar while true. See `useHeaderGlass()`. */
  glass?: boolean
}

export function PageHeader(props: HeaderProps) {
  if (supportsLiquidGlass) {
    return (
      <NativeHeader
        title={props.title}
        subtitle={props.subtitle}
        icon={<Icon icon={props.icon} size={20} className="text-base-primary-default" />}
        titleClassName="text-base-primary-default"
        glass={props.glass}
      />
    )
  }

  return <JsPageHeader {...props} />
}

const PRIMARY_COLOR = '#FF6A13' // base-primary-default

// UINavigationBar's height on iPhone in portrait (the app is portrait-only).
const NAVIGATION_BAR_HEIGHT = 44

/**
 * Top padding for the list of a screen with a native header (<PageHeader />,
 * <BackHeader />, <NativeHeader />): on iOS 26 the list scrolls under the
 * native header, so it has to start below it. 0 elsewhere. For a list with
 * `nativeHeaderScrollProps`, pad only what doesn't scroll (e.g. a skeleton).
 *
 * Not `useHeaderHeight()`: the native stack never reports this header's height,
 * so it stays 0.
 */
export function usePageHeaderInset() {
  const insets = useSafeAreaInsets()
  return supportsLiquidGlass ? insets.top + NAVIGATION_BAR_HEIGHT : 0
}

/**
 * Spread on the scrolling list of a screen with a native header. On iOS 26 UIKit
 * insets the list below the bar (and places its scroll indicator and refresh
 * spinner), so don't pad it with `usePageHeaderInset()` as well. Set it
 * explicitly: react-native-screens only switches the screen's first scroll view
 * to `automatic`, and that lookup can miss. Nothing elsewhere.
 */
export const nativeHeaderScrollProps = supportsLiquidGlass
  ? ({ contentInsetAdjustmentBehavior: 'automatic' } as const)
  : {}

interface NativeHeaderProps {
  /** Left out for a bar with only the back button. */
  title?: string
  subtitle?: string
  icon?: React.ReactNode
  titleClassName?: string
  /** Custom centred title content, in place of `title`, `subtitle` and `icon`. */
  titleNode?: React.ReactNode
  /**
   * Left-aligned title content, in place of the back button (for a stack's
   * root screen). Drawn without a glass capsule.
   */
  leftNode?: React.ReactElement
  /**
   * Left-aligned title content after the back button, drawn without a glass
   * capsule. For a screen that keeps its back button; not with `leftNode`.
   */
  besideBackNode?: React.ReactElement
  /** Shown on the right in a glass capsule. */
  rightNode?: React.ReactElement
  /** Draw `rightNode` without its glass capsule (e.g. plain text). */
  rightNodeBare?: boolean
  /**
   * Draw Liquid Glass behind the bar while true, in place of the system's
   * scroll edge blur (see `useHeaderGlass()`). Left out: the system's hard blur.
   */
  glass?: boolean
}

/**
 * iOS 26 only (check `supportsLiquidGlass`): shows the stack's native
 * navigation bar, so the back button is a Liquid Glass button and the
 * swipe-back gesture matches the system. The screen scrolls under the bar and
 * iOS blurs it at the top edge (this needs our react-native-screens patch). Spread
 * `nativeHeaderScrollProps` on the screen's list to start it below the bar.
 */
export function NativeHeader(props: NativeHeaderProps) {
  const hasTitle = !!props.title
  const { titleNode, leftNode, besideBackNode, rightNode, rightNodeBare, glass } = props
  return (
    <>
      <Stack.Screen
        options={{
          ...(leftNode && {
            unstable_headerLeftItems: () => [
              { type: 'custom', element: leftNode, hidesSharedBackground: true },
            ],
          }),
          ...(besideBackNode && {
            // Visible back button: UIKit then puts the left items after it.
            headerBackVisible: true,
            unstable_headerLeftItems: () => [
              { type: 'custom', element: besideBackNode, hidesSharedBackground: true },
            ],
          }),
          ...(rightNode && {
            unstable_headerRightItems: () => [
              { type: 'custom', element: rightNode, hidesSharedBackground: rightNodeBare },
            ],
          }),
          headerShown: true,
          // The default with Liquid Glass, set so the screen always extends under
          // the bar: react-native-screens insets the content of an opaque header.
          headerTransparent: true,
          title: props.title ?? '',
          headerTitle: titleNode
            ? () => titleNode
            : hasTitle
              ? () => (
                  <View className="flex flex-col items-center">
                    <View className="flex flex-row items-center gap-1.5">
                      {props.icon}
                      <Text
                        className={cn(
                          'font-heading-semibold text-lg text-base-text-high',
                          props.titleClassName
                        )}
                        // The native bar is a fixed 44pt and doesn't grow for a custom title.
                        maxFontSizeMultiplier={1}
                      >
                        {props.title}
                      </Text>
                    </View>
                    {props.subtitle && (
                      <Text
                        className="-mt-1 text-xs text-base-text-medium font-heading-regular"
                        maxFontSizeMultiplier={1}
                      >
                        {props.subtitle}
                      </Text>
                    )}
                  </View>
                )
              : '',
          headerBackButtonDisplayMode: 'minimal',
          headerTintColor: PRIMARY_COLOR,
          // The default soft edge only fades a thin band under the status bar;
          // hard blurs the whole bar's backing, so the list doesn't show through
          // the title or around the back button.
          scrollEdgeEffects: { top: glass === undefined ? 'hard' : 'hidden' },
        }}
      />
      {glass !== undefined && <GlassBarBackground visible={glass} />}
    </>
  )
}

interface BackHeaderProps {
  /** The JS header's container, for Android and older iOS. */
  className?: string
  onBack?: () => void
  /** Shown beside the back button (or as the native bar's title on iOS 26). */
  title?: React.ReactNode
  /**
   * Left-aligned beside the back button on every platform (in place of
   * `title`), with `trailing` at the bar's right end. Keep them short: the
   * native bar is a fixed 44pt.
   */
  leading?: React.ReactElement
  trailing?: React.ReactElement
  /**
   * iOS 26: draw Liquid Glass behind the bar while this is true (e.g. once the
   * list has scrolled), in place of the system's scroll edge blur.
   */
  glass?: boolean
}

/**
 * A header with a back button, fixed above the screen's content. On iOS 26 the
 * native bar (see <NativeHeader />). Elsewhere a white row with the outlined
 * back button.
 */
export function BackHeader({
  className = 'pt-safe-offset-4 pb-2 px-4 bg-base-bg-white',
  onBack,
  title,
  leading,
  trailing,
  glass,
}: BackHeaderProps) {
  const router = useRouter()
  if (supportsLiquidGlass) {
    return (
      <NativeHeader
        titleNode={leading ? undefined : title}
        besideBackNode={leading}
        rightNode={trailing}
        rightNodeBare
        glass={glass}
      />
    )
  }
  const body = leading ?? title
  return (
    <View className={cn('flex flex-row items-center gap-3', className)}>
      <BackButton onPress={onBack ?? (() => router.back())} aria-label="กลับ" />
      {body && <View className="flex-1">{body}</View>}
      {trailing}
    </View>
  )
}

function JsPageHeader(props: HeaderProps) {
  const router = useRouter()

  return (
    <View className="p-4 pt-safe-offset-4 flex flex-row justify-between items-center bg-base-bg-white">
      <BackButton
        onPress={() => {
          router.back()
        }}
        aria-label="กลับ"
      />
      <View className="flex flex-col gap-1 items-end">
        <View className="inline-flex flex-row justify-center gap-2 items-center">
          <Icon icon={props.icon} size={32} className="text-base-primary-default align-middle" />
          <H1 className="font-heading-semibold text-3xl text-base-primary-default">
            {props.title}
          </H1>
        </View>
        {props.subtitle && (
          <Text className="text-base-text-medium text-base font-heading-regular">
            {props.subtitle}
          </Text>
        )}
      </View>
    </View>
  )
}

/**
 * Whether a screen's list has scrolled under its native header, for the
 * header's `glass` (iOS 26). Spread `scrollProps` on the list: they include
 * `nativeHeaderScrollProps` and room for the floating tab bar. For a list padded
 * with `usePageHeaderInset()` instead, pass `{ padded: true }` (its scroll
 * indicator is then inset below the header too).
 */
export function useHeaderGlass({ padded = false }: { padded?: boolean } = {}) {
  const headerInset = usePageHeaderInset()
  // An inset list rests at minus the inset, below the bar; a padded one at 0.
  const restOffset = padded ? 0 : -headerInset
  const tabBarInsets = useTabBarScrollInsets({ automatic: !padded })
  const [glass, setGlass] = React.useState(false)
  const onScroll = React.useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrolled = event.nativeEvent.contentOffset.y > restOffset
      setGlass((was) => (was === scrolled ? was : scrolled))
    },
    [restOffset]
  )
  return {
    glass,
    onScroll,
    scrollProps: padded
      ? {
          onScroll,
          scrollEventThrottle: 16,
          ...tabBarInsets,
          scrollIndicatorInsets: { top: headerInset, ...tabBarInsets.scrollIndicatorInsets },
        }
      : { ...nativeHeaderScrollProps, onScroll, scrollEventThrottle: 16, ...tabBarInsets },
  }
}

export type HeaderGlass = ReturnType<typeof useHeaderGlass>

/**
 * The large title's block on a tab screen with <TabHeader />. On iOS 26 the bar
 * above it already leaves space, so it sits closer.
 */
// The title's row lines up with the bar: on iOS 26 it is pulled up into the
// native bar (44pt) beside the bar's items; elsewhere the JS bar is 56pt.
export const tabTitleBlockClassName = cn(
  'px-4 pb-4',
  supportsLiquidGlass ? '-mt-11 pt-0.5' : 'pt-2'
)

/**
 * Tracks a screen's scroll for a header whose title fades in once the screen's
 * own title scrolls under it. Spread `scrollProps` on the list (an Animated or
 * reanimated-wrapped list) and pass `onTitleLayout` to the in-page title.
 */
export function useCollapsingTitle() {
  const headerInset = usePageHeaderInset()
  const tabBarInsets = useTabBarScrollInsets({ automatic: true })
  const scrollY = useSharedValue(0)
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      // On iOS 26 the list rests at minus the bar's inset, below the bar.
      scrollY.value = event.contentOffset.y + headerInset
    },
  })
  const [showAt, setShowAt] = React.useState(0)
  // Whether the in-page title has mostly scrolled away, for what can't animate
  // on the UI thread (the native bar's scroll edge effect).
  const [collapsed, setCollapsed] = React.useState(false)
  useAnimatedReaction(
    () => titleProgress(scrollY.value, showAt) > 0.5,
    (now, before) => {
      if (now !== before) runOnJS(setCollapsed)(now)
    }
  )
  // Whether anything has scrolled under the header.
  const [scrolled, setScrolled] = React.useState(false)
  useAnimatedReaction(
    () => scrollY.value > 0,
    (now, before) => {
      if (now !== before) runOnJS(setScrolled)(now)
    }
  )
  const onTitleLayout = React.useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout
    setShowAt(y + height)
  }, [])
  return {
    scrollY,
    showAt,
    collapsed,
    scrolled,
    onTitleLayout,
    /** The list's offset at its top: for scroll-to-top on a tab press. */
    topOffset: -headerInset,
    scrollProps: { ...nativeHeaderScrollProps, onScroll, scrollEventThrottle: 16, ...tabBarInsets },
  }
}

export type CollapsingTitle = ReturnType<typeof useCollapsingTitle>

const TITLE_FADE_DISTANCE = 24

/** 0 while the in-page title shows, 1 once it has scrolled under the header. */
function titleProgress(scrollY: number, showAt: number) {
  'worklet'
  if (showAt <= 0) return 0
  return interpolate(scrollY, [showAt - TITLE_FADE_DISTANCE, showAt], [0, 1], Extrapolation.CLAMP)
}

/** Header content that fades and slides in as the in-page title scrolls away. */
export function FadeInHeaderTitle(props: {
  collapsing: Pick<CollapsingTitle, 'scrollY' | 'showAt'>
  children: React.ReactNode
  className?: string
}) {
  const { scrollY, showAt } = props.collapsing
  const style = useAnimatedStyle(() => {
    const progress = titleProgress(scrollY.value, showAt)
    return { opacity: progress, transform: [{ translateY: (1 - progress) * 8 }] }
  })
  return (
    <Animated.View
      style={[style, supportsLiquidGlass && { maxWidth: 240 }]}
      className={cn('flex flex-row items-center gap-2', props.className)}
      pointerEvents="none"
    >
      {props.children}
    </Animated.View>
  )
}

interface TabHeaderProps {
  title: string
  /** About 26pt, in the primary colour. */
  icon: React.ReactNode
  collapsing: CollapsingTitle
  /**
   * A control on the right, always shown (e.g. a picker). On iOS 26 it sits in
   * a glass capsule, so give it no border or background of its own.
   */
  right?: React.ReactElement
}

/**
 * The compact header of a tab's root screen, shown once the screen's large
 * title scrolls away. On iOS 26 the native bar with a hard blur; elsewhere a
 * white bar under the status bar. Use inside <TabScreenLayout />.
 */
export function TabHeader({ title, icon, collapsing, right }: TabHeaderProps) {
  const content = (
    <FadeInHeaderTitle collapsing={collapsing}>
      {icon}
      <Text
        className="shrink font-heading-semibold text-2xl text-base-primary-default"
        numberOfLines={1}
        maxFontSizeMultiplier={1}
      >
        {title}
      </Text>
    </FadeInHeaderTitle>
  )
  if (supportsLiquidGlass) {
    return (
      <NativeHeader
        leftNode={content}
        rightNode={right}
        // The large title sits in the bar until it scrolls away: show the
        // glass only after that.
        glass={collapsing.collapsed}
      />
    )
  }
  return (
    <JsTabHeader collapsing={collapsing} right={right}>
      {content}
    </JsTabHeader>
  )
}

const NATIVE_BAR_GLASS_FADE = 0.25
// iOS 26 bar buttons are 44pt capsules filling the bar; extend the glass a bit
// below them so they don't sit on its edge.
const GLASS_BAR_EXTRA_HEIGHT = 8

/** Liquid Glass behind the native bar, shown once the page's title has scrolled away. */
function GlassBarBackground({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets()
  return (
    <GlassView
      pointerEvents="none"
      glassEffectStyle={{
        style: visible ? 'regular' : 'none',
        animate: true,
        animationDuration: NATIVE_BAR_GLASS_FADE,
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: insets.top + NAVIGATION_BAR_HEIGHT + GLASS_BAR_EXTRA_HEIGHT,
        zIndex: 10,
      }}
    />
  )
}

function JsTabHeader(props: {
  collapsing: CollapsingTitle
  children: React.ReactNode
  right?: React.ReactNode
}) {
  const insets = useSafeAreaInsets()
  const { scrollY, showAt } = props.collapsing
  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: titleProgress(scrollY.value, showAt),
  }))
  return (
    <View
      pointerEvents="box-none"
      style={{ top: insets.top }}
      className="absolute left-0 right-0 z-10 h-14 px-4 flex flex-row items-center justify-between gap-3"
    >
      {/* The bar's background shows once the page's title has scrolled away. */}
      <Animated.View
        pointerEvents="none"
        style={backgroundStyle}
        className="absolute inset-0 bg-base-bg-white border-b border-base-outline-default"
      />
      <View className="flex-1" pointerEvents="none">
        {props.children}
      </View>
      {props.right}
    </View>
  )
}

/**
 * The root of a tab screen with <TabHeader />: on iOS 26 the list scrolls
 * under the native bar up to the top edge; elsewhere below the status bar.
 */
export function TabScreenLayout(props: { children: React.ReactNode }) {
  if (supportsLiquidGlass) {
    // White behind the bar, where the list rests below it, to match the title.
    return <View className="flex-1 bg-base-bg-white">{props.children}</View>
  }
  return <SafeAreaLayout>{props.children}</SafeAreaLayout>
}
