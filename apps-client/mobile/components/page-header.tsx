import React from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icon } from '@pple-today/ui/icon'
import { cn } from '@pple-today/ui/lib/utils'
import { Text } from '@pple-today/ui/text'
import { H1 } from '@pple-today/ui/typography'
import { Stack, useRouter } from 'expo-router'
import { LucideIcon } from 'lucide-react-native'

import { BackButton } from '@app/components/back-button'
import { supportsLiquidGlass } from '@app/utils/liquid-glass'

interface HeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  onBack?: () => void
}

export function PageHeader(props: HeaderProps) {
  if (supportsLiquidGlass) {
    return (
      <NativeHeader
        title={props.title}
        subtitle={props.subtitle}
        icon={<Icon icon={props.icon} size={20} className="text-base-primary-default" />}
        titleClassName="text-base-primary-default"
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
 * native header, so it has to start below it. 0 elsewhere.
 *
 * Not `useHeaderHeight()`: the native stack never reports this header's height,
 * so it stays 0.
 */
export function usePageHeaderInset() {
  const insets = useSafeAreaInsets()
  return supportsLiquidGlass ? insets.top + NAVIGATION_BAR_HEIGHT : 0
}

interface NativeHeaderProps {
  /** Left out for a bar with only the back button. */
  title?: string
  subtitle?: string
  icon?: React.ReactNode
  titleClassName?: string
}

/**
 * iOS 26 only (check `supportsLiquidGlass`): shows the stack's native
 * navigation bar, so the back button is a Liquid Glass button and the
 * swipe-back gesture matches the system. The screen scrolls under the bar and
 * iOS blurs it at the top edge (this needs our react-native-screens patch), so
 * pad the screen's list with `usePageHeaderInset()` to start it below the bar.
 */
export function NativeHeader(props: NativeHeaderProps) {
  const hasTitle = !!props.title
  return (
    <Stack.Screen
      options={{
        headerShown: true,
        title: props.title ?? '',
        headerTitle: hasTitle
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
        // With a title, the default soft edge only fades a thin band and the
        // list would show through the text; hard draws a solid backing under the
        // bar. A bar with only the back button keeps the soft blur.
        scrollEdgeEffects: { top: hasTitle ? 'hard' : 'automatic' },
      }}
    />
  )
}

interface BackHeaderProps {
  /** The JS header's container, for Android and older iOS. */
  className?: string
  onBack?: () => void
}

/**
 * A header with only a back button, fixed above the screen's content. On iOS 26
 * the native bar (see <NativeHeader />): pad the list with
 * `usePageHeaderInset()`. Elsewhere a white row with the outlined back button.
 */
export function BackHeader({
  className = 'pt-safe-offset-4 pb-2 px-4 bg-base-bg-white',
  onBack,
}: BackHeaderProps) {
  const router = useRouter()
  if (supportsLiquidGlass) {
    return <NativeHeader />
  }
  return (
    <View className={className}>
      <BackButton onPress={onBack ?? (() => router.back())} aria-label="กลับ" />
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
